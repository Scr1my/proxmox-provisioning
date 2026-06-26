import { Injectable, NotFoundException } from '@nestjs/common';
import { proxmoxApi } from 'proxmox-api';
import { PrismaService } from 'src/prisma/prisma.service';

import { Environment, Environment_node } from '@prisma/client';
import { UtilsService } from 'src/utils/utils.service';
import { LogService } from 'src/utils/log.service';
import { Status } from "src/common/enums/status.enum"
import { MachineType } from "src/common/enums/machine-type.enum"
import * as path from 'path';
import * as fs from 'fs';

// used in connection to establish with node o env.
type ConnectionInput =
    | { envId: number; nodeId?: never }
    | { nodeId: number; envId?: never };

@Injectable()
export class ProxmoxService {
    private readonly context = "proxmox.service";
    constructor( 
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly log: LogService
    ) {}

    /*--------!!Connections!!--------*/

    /*----Create ProxmoxAPI connection object----*/
    createClient(env: { host: string; port?: number; tokenID: string; tokenSecret: string; }) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        return proxmoxApi({
            host: env.host,
            port: env.port ?? 8006, 
            tokenID: env.tokenID,
            tokenSecret: env.tokenSecret,
        });
    }

    /*----Return the object with PVE connection----*/
    async getProxmoxConnection(input: ConnectionInput) {
        const env = await this.prisma.environment.findUnique({
            where: {
                id: input.envId ?? (    // Find env in the DB by nevId
                    await this.prisma.environment_node.findUnique({ // Find it by nodeId
                        where: { id: input.nodeId }
                    })
                ).environment_id
            },
            include: {
                environment_nodes: true
            }
        });

        if (!env) throw new NotFoundException(`Environment not found`);

        const nodes = input.nodeId
            ? env.environment_nodes.filter(n => n.id === input.nodeId)
            : env.environment_nodes;

        const { node, pve } = await this.testNodes(env, nodes);
        return { pve, env, node };
    }

    /*----Check if pve node is avalaible----*/
    async testNodes ( env: Environment, nodes: Environment_node[]): Promise<{ node: Environment_node; pve: any }> {
        for (const node of nodes) {
            try {
                const pve = this.createClient({ // Create the object for a connection
                    host: node.ip,
                    tokenID: `${env.username}!${env.token_name}`,
                    tokenSecret: env.token_secret,
                });

                const isReachable = await this.isEnvReachable(pve); // Try if reachable
                if (isReachable) {
                    return { node, pve };
                }
                else {
                    const context = "proxmox.service";
                    //this.log.error(`Node ${node.name} on environment ${env.name} is not reachable`, context);
                }
            } catch (err) {
                
                continue
            }
        }
    }

    /*----Check if the pve is reachable----*/
    private async isEnvReachable(pve: any): Promise<boolean> {
         try {
            // Try a get request on pve API
            await Promise.race([
                pve.nodes.$get(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 500)
                ),
            ]);
            return true;
        } catch (err) {
            return false;
        }
    }



    /*--------!!Machines!!--------*/

    /*----Create new machine----*/
    async createMachine(pve: any, node: string, type: MachineType, config: Record<string, any>) {
        return pve.nodes.$(node)[type].$post(config);
    }

    /*----Clone a machine----*/
    async cloneMachine(pve: any, node: string, templateVmid: number, type: string, machineConfig: any) {
        return pve
            .nodes.$(node)
            [type].$(templateVmid)
            .clone
            .$post(machineConfig);
    }

    /*----Covert machine into template----*/
    async convertMachineToTemplate(pve: any, nodeName: string, vmid: number, type: MachineType) {
        return pve.nodes.$(nodeName)[type].$(vmid).template.$post({});
    }

    /*----Set machine HW resources----*/
    async setMachineResources(pve: any, node: string, vmid: number, type: MachineType, resources: any) {
        const config: any = {
            memory: resources.ram,
            cores: resources.cores,
        };

        if (type === MachineType.LXC) {
            config.net0 = `name=eth0,bridge=${resources.linux_bridge},ip=${resources.ip}/${resources.lan_prefix}`;
            config.gateway = resources.gateway;
        } 
        else {  // if VM user cloud-int for credential
            config.net0 = `virtio,bridge=${resources.linux_bridge}`;
            config.ipconfig0 = `ip=${resources.ip}/${resources.lan_prefix},gw=${resources.gateway}`;
            config.ciuser = resources.user;
            config.cipassword = resources.password;

            if (resources.os === "windows") {   // addition config for win machine
                config.ostype = resources.ostype ?? 'win11';
            }
        }

        return pve
            .nodes.$(node)
            [type].$(vmid)
            .config
            .$put(config);
    }

    /*----Create sudoers username and password----*/
    async changeMachineCredential(node: Environment_node, vmid: number, username: string, password: string, type: MachineType) {
        const command = type === MachineType.LXC ? "pct" : "qm" // Set command type based on machine type
        const ssh = await this.utils.startSSHConnection(node);
        try {
            // Add user if already exist nothing appen
            const userCmd = `${command} exec ${vmid} -- bash -c ' 
                id "${username}" &>/dev/null || useradd -m "${username}";
                echo "${username}:${password}" | chpasswd'`;
            const userResult = await ssh.execCommand(userCmd);

            if (userResult.code !== 0) {
                throw new Error('Errore durante il cambio password');
            }

            // Make user sudoers
            const groupCmd = `${command} exec ${vmid} -- bash -c '
                if getent group sudo > /dev/null 2>&1; then
                    usermod -aG sudo "${username}";
                elif getent group wheel > /dev/null 2>&1; then
                    usermod -aG wheel "${username}";
                fi'`;
            const groupResult = await ssh.execCommand(groupCmd);

            if (groupResult.code !== 0) {
                throw new Error('Errore durante l\'aggiunta a sudoers');
            }
        } finally {
            await this.utils.closeSSHConnection(ssh);
        }
    }

    /*----Run machine provisiong script----*/
    async runProvisioningScript(node: Environment_node, vmid: number, type: MachineType, scriptName: string) {
        const command = type === MachineType.LXC ? "pct" : "qm" // Set command type based on machine type
        // Get file info
        const scriptFolder = process.env.PROVISIONING_SCRIPTS_FOLDER;
        const localPath = path.join(scriptFolder, scriptName);
        const remoteTmpPath = `/tmp/${scriptName}`;
        const scriptContent = (await fs.promises.readFile(localPath, 'utf-8'))
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        const ssh = await this.utils.startSSHConnection(node);
        try {
            // Write the script file into pve node 
            const escapedContent = scriptContent.replace(/'/g, `'\\''`);
            const pveCmd = `cat > ${remoteTmpPath} << 'EOFSCRIPT'\n${escapedContent}\nEOFSCRIPT`;
            const pevResult = await ssh.execCommand(pveCmd);
            if (pevResult.code !== 0) {
                throw new Error(`Error writing provisioning script into node ${node.name}: ${pevResult.stderr}`);
            }

            // Write the script file into machine 
            const lxcCmd = `${command} push ${vmid} ${remoteTmpPath} /tmp/${scriptName} && ${command} exec ${vmid} -- chmod +x /tmp/${scriptName}`;
            const lxcResult = await ssh.execCommand(lxcCmd)
            if (lxcResult.code !== 0) {
                throw new Error(`Error writing provisioning script into the machine: ${lxcResult.stderr}`);
            }

            // Run the script into the machine
            const execCmd = `${command} exec ${vmid} -- bash /tmp/${scriptName}`;
            const execResult = await ssh.execCommand(execCmd);

            // Clean PVE node
            await ssh.execCommand(`rm -f ${remoteTmpPath}`);

            if (execResult.code !== 0) {
                throw new Error(`Provisioning script failed: ${execResult.stderr}`);
            }
        } finally {
            await this.utils.closeSSHConnection(ssh);
        }
    }

    /*----Delete machine----*/
    async deleteMachine(pve: any, nodeName: string, vmid: number, type: MachineType) {
        try {
            await pve.nodes.$(nodeName)[type].$(vmid).$delete();
            return { ok: true };
        } catch (err: any) {
            throw new Error(
                err?.message || `Failed to delete VM ${vmid} on node ${nodeName}`
            );
        }
    }

    /*----Return machine status----*/
    async getMachineStatus(pve: any, nodeName: string, vmid: number, machineType: string) {
        const node = pve.nodes.$(nodeName);
        return await node[machineType].$(vmid).status.current.$get();
    }

    /*----Change machine status----*/
    async changeMachineStatus(pve: any, node: string, vmid: number, type: MachineType, status: Status) {
        return pve
            .nodes.$(node)
            [type].$(vmid)
            .status[status]
            .$post();
    }



    /*--------!!List!!--------*/

    /*----List all lxc template avalaible in specific storage----*/
    async listDownloadedLXCTemplates(pve: any, node: string, storage: string): Promise<JSON> {
        const content = await pve.nodes.$(node).storage.$(storage).content.$get();
        return content.filter((t: any) => t.content === "vztmpl");
    }

    /*----List os ISO----*/
    async listISOImages(pve: any, node: string, storage: string): Promise<JSON> {
        const content = await pve.nodes.$(node).storage.$(storage).content.$get();
        return content.filter((t: any) => t.content === "iso");
    }

    

    /*--------!!Utils!!--------*/

    /*----Get an avalaibe vmid----*/
    async getVmid(pve: any, rangeStart: number = 3000, rangeEnd: number = 4000): Promise<number> {
        const resources = await pve.cluster.resources.$get();

        // Check the used vmid in the PVE
        const usedIds = new Set<number>(
            resources
            .filter(r => r.vmid)
            .map(r => Number(r.vmid))
        );

        // Find a free vmid
        for (let id = rangeStart; id <= rangeEnd; id++) {
            if (!usedIds.has(id)) {
                return id;
            }
        }

        throw new Error(
            `No available VMID in range [${rangeStart}-${rangeEnd}]`,
        );
    }

    /*----Wait that proxmox task is completed----*/
    async waitForTask(pve: any, node: string, upid: string) {
        const encodedUpid = encodeURIComponent(upid);   // Convert UPID special chars for URL
        while (true) {
            // Call the endpoint for task status
            const task = await pve
                .nodes.$(node)
                .tasks.$(encodedUpid)
                .status
                .$get();
                
            // Check the status and exit status for error
            if (task.status === 'stopped') {
                if (task.exitstatus && task.exitstatus !== 'OK') {
                    throw new Error(`Task fallito: ${task.exitstatus}`);
                }
                return;
            }
            await new Promise(r => setTimeout(r, 2000)); //if the task is still running wait for 2 seconds
        }
    }

    

    

    

    /*----Return the ticket for noVNC connection to a machine----*/
    async openNoVNC(node: Environment_node & { environment: Environment }, vmid: number, type: MachineType) {
        // this function is a little different beacuse the endpoint require 
        // username and password authentication
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        // Get the CSRFPreventionToken and ticket for PVE auth
        try {
            const accessTicket = await fetch(`https://${node.ip}:8006/api2/json/access/ticket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'username':node.environment.username, "password":node.environment.password})
            });
            const { data } = await accessTicket.json();
            const ticket = data.ticket;
            const csrf = data.CSRFPreventionToken;

            // get no vnc resources
            const vncRes = await fetch(
                `https://${node.ip}:8006/api2/json/nodes/${node.name}/${type}/${vmid}/vncproxy`,
                {
                    method: 'POST',
                    headers: {
                        'CSRFPreventionToken': csrf,
                        'Cookie': `PVEAuthCookie=${ticket}`
                    }
                }
            );
            const { data: vncData } = await vncRes.json();
            this.log.log("data for novnc connection obtained successfully", this.context);
            const vncTicket = vncData.ticket
            return {vncTicket, ticket}
        } catch (error: any) {
            this.log.error("Error with novnc connection", error, this.context);
            return
        }   
    }
}
