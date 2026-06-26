import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from 'src/proxmox/proxmox.service';
import { Environment_node, Machine } from '@prisma/client';
import { UtilsService } from '../utils/utils.service';
import { LogService } from '../utils/log.service';
import { Status } from "src/common/enums/status.enum"
import { MachineType, toMachineType } from 'src/common/enums/machine-type.enum';
import { AuthService } from '../auth/auth.service';
import { Permission } from 'src/common/enums/permission.enum';
import { ChangeMachineStatusDto } from 'src/common/dto/change-machine-status.dto';
import { NoVNCDto } from 'src/common/dto/novnc.dto';
import { deleteMachineDto } from 'src/common/dto/delete-machine.dto';

@Injectable()
export class MachineService {
    private readonly context = "machine.service";
    constructor(
        private readonly proxmoxService: ProxmoxService,
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly log: LogService,
        private readonly auth: AuthService,
    ) {}

    /*----Get the necessary for render machines list----*/
    async getMachines(user: any) {
        const where: any = {};

        const canApproveGeneric  = await this.auth.hasPermission(user.sub, Permission.CAN_APPROVE_GENERIC);
        const canApproveSpecific = await this.auth.hasPermission(user.sub, Permission.CAN_APPROVE_SPECIFIC);

        if (!canApproveGeneric) {
            const orConditions: any[] = [
                { requestMachine: { request: { requester_id: user.sub } } }
            ];

            if (canApproveSpecific) {
                orConditions.push(
                    { requestMachine: { request: { approver_id: user.sub } } }
                );
            }

            where.OR = orConditions;
        }

        const machines = await this.prisma.machine.findMany({
            where,
            include: {
                credential: true,
                requestMachine: {
                    include: {
                        request: {
                            include: { requester: true }
                        },
                        machine_template: true,
                    }
                }
            }
        });

        return { title: "Machines", machines };
    }

    /*----Get if user can access the machine----*/
    async checkMachinePermission(vmid: number, user: any){
        const machine = await this.prisma.machine.findUnique({
            where: { vmid },
            include: {
                requestMachine: {
                    include: {
                        request: true
                    }
                }
            }
        });

        if (!machine) throw new NotFoundException('Machine not found');

        const isGenericApprover = await this.auth.hasPermission(user.sub, Permission.CAN_APPROVE_GENERIC);
        const isMachineApprover = machine.requestMachine?.request?.approver_id === user.sub;
        const isMachineRequester = machine.requestMachine?.request?.requester_id === user.sub;

        if (!isGenericApprover && !isMachineApprover && !isMachineRequester) {
        throw new ForbiddenException('insufficient permissions');
        }
    }

    /*----Get machine status----*/
    async getMachineStatus(nodeId: number, vmid: number, machine_type: MachineType, user: any) {
        const { pve, env, node } = await this.proxmoxService.getProxmoxConnection({ nodeId });

        await this.checkMachinePermission(vmid, user);

        const status = (await this.proxmoxService.getMachineStatus(pve, node.name, vmid, machine_type)).status;
        return { status };
    }

    /*----Create a new machine----*/
    async createMachine(requestMachineId: number) {
        const requestMachine = await this.prisma.requestMachine.findUnique({
            where: {id: Number(requestMachineId)},
            include: {
                request: {
                    include: {
                        requester: true
                    }
                },
                machine_template: {
                    include: {
                        machine_type: true
                    }
                }
            }
        })
        const { pve, env, node} = await this.proxmoxService.getProxmoxConnection({ nodeId: requestMachine.environment_node_id});
        await this.utils.changeRequestStatus("machine", Number(requestMachineId), "INPROGRESS");    // change status to block action
        
        
        const prepareMachineResult = await this.prepareMachine(pve, env, node, requestMachine)
        if(prepareMachineResult.exitCode !== 0) {
            await this.utils.changeRequestStatus("machine", Number(requestMachineId), "PENDING");
            return { error: ` error creating machine: ${prepareMachineResult.message}` }
        }
        
        await this.utils.changeRequestStatus("machine", Number(requestMachineId), "APPROVED");
        return { success: "machine created successfully"}
    }
    
    /*----Prepare a machine crating and applying config ----*/
    async prepareMachine(pve, env, node, requestMachine) {
        const newVmid = await this.proxmoxService.getVmid(pve, 4000, 5000);
        const ip = await this.utils.getAvalaibleIP(env);
        const hostname = requestMachine.hostname;
        const ram = requestMachine.machine_template.ram;
        const cores = requestMachine.machine_template.cores;
        const templateVmid = requestMachine.machine_template.machine_type.vmid;
        const type = toMachineType(requestMachine.machine_template.machine_type.type);
        const os = requestMachine.machine_template.machine_type.os;
        const username = requestMachine.request.requester.username;
        const password = this.utils.generatePassword();
        const cloneResources = {newid: newVmid, hostname}
        const resources = { // config for LXC and VM
            ram,
            cores,
            ip,
            linux_bridge: env.linux_bridge,
            lan_prefix: env.lan_prefix,
            gateway: env.machine_gateway,
            user: username,
            password,
            os,
        };

        try {
            const clonetemplateTask = await this.proxmoxService.cloneMachine(pve, node.name, templateVmid, type, cloneResources);
            await this.proxmoxService.waitForTask(pve, node.name, clonetemplateTask);
            await this.proxmoxService.setMachineResources(pve, node.name, newVmid, type, resources);
            
            const newMachine = await this.prisma.machine.create({
                data: {
                    vmid: newVmid,
                    ip,
                    request_Machine_id: requestMachine.id,
                    machine_type: requestMachine.machine_template.machine_type.type,
                }
            })
            
            // Boot the machine
            const startMachineTask = await this.proxmoxService.changeMachineStatus(pve, node.name, newVmid, type, Status.start);
            await this.proxmoxService.waitForTask(pve, node.name, startMachineTask)

            // setting machine credential for LXC
            if (type === MachineType.LXC) {
                const credentialResult = await this.setCredential(node, newMachine, username, password, MachineType.LXC);
                if(credentialResult.exitCode !== 0) {
                    return { exitCode: 1, message: credentialResult.message }
                }
            }

            // Machine Provisioning
            const provisioningResult = await this.executeProvisioning(requestMachine, node, newVmid, type);
            if(provisioningResult.exitCode !== 0) {
                return provisioningResult.message
            }
            this.log.log(`requestmachine ${requestMachine.id} prepared successfully`, this.context)
            return { exitCode: 0, message: "machine prepared without problems", data: {newVmid} }
        } catch (error) {
            this.log.error(`error preparing requestmachine ${requestMachine.id}`, error, this.context)
            await this.utils.changeRequestStatus("machine", requestMachine.id, "PENDING");
            return { exitCode: 1, message: error.message };
        }
    }

    /*----Set username and password on machine----*/
    async setCredential(node: Environment_node, newMachine: Machine, username: string, password: string, type: MachineType) {
        try {
            await this.prisma.credential.create({   //in case of error reset avalaible
                data: {
                    machine_id: newMachine.id,
                    username,
                    password,
                }
            })
            await this.proxmoxService.changeMachineCredential(node, newMachine.vmid, username, password, type);
            return { exitCode: 0, message: "credential setted without problems" };
        } catch (error) {
            //await this.changeStatus("machine", Number(requestMachineId), "PENDING");
            this.log.error("error changing lxc password", error.stack, "request.service");
            return { exitCode: 1, message: error.message };
        }
    }

    /*----Execute Provisioning script----*/
    async executeProvisioning(requestMachine, node, newVmid, type: MachineType) {
        this.log.log(`executing provisioning script on machine ${newVmid}`, this.context)
        try {
            const scriptName = requestMachine.machine_template.provisiong_script;
            if (scriptName) {
                await this.proxmoxService.runProvisioningScript(node, newVmid, type, scriptName);
            }
            this.log.log(`provisioning script on machine ${newVmid} executed successfully`, this.context)
            return { exitCode: 0, message: "script executed without problem" };
        } catch (error) {
            await this.utils.changeRequestStatus("machine", requestMachine.id, "PENDING");
            this.log.error("error during provisioning", error.stack, "request.service");
            return { exitCode: 1, message: error.message };
        }
    }

    /*----Change machine status----*/
    async changeMachineStatus(vmid: number, dto: ChangeMachineStatusDto, status: Status, user) {
        const nodeId = dto.nodeId;
        const type = toMachineType(dto.type);
        const { pve, env, node} = await this.proxmoxService.getProxmoxConnection({ nodeId });

        await this.checkMachinePermission(vmid, user);

        await this.proxmoxService.changeMachineStatus(pve, node.name, vmid, type, status)
    }

    /*----Return the url and ticket for noVNC connection----*/
    async noVNC(vmid: number, dto: NoVNCDto) {
        const nodeId = dto.nodeId;
        const type = toMachineType(dto.type);

        const node = await this.prisma.environment_node.findUnique({
            where : { id: nodeId},
            include: { environment: true}
        })

        const {vncTicket, ticket } = await this.proxmoxService.openNoVNC(node, vmid, type);
        const url = `https://${node.ip}:8006/?console=lxc&novnc=1&vmid=${vmid}&node=${node.name}&resize=off&vncticket=${vncTicket}`;
        return {url: url, authTicket: ticket}
    }

    /*----Delete machine----*/
    async deleteMachine(vmid: number, dto: deleteMachineDto) {
        const nodeId = dto.nodeId;
        const type = toMachineType(dto.type);

        try {
            const { pve, node } = await this.proxmoxService.getProxmoxConnection({ nodeId });

            // stop machine before deleting
            const status = await this.proxmoxService.getMachineStatus(pve, node.name, vmid, type);
            if (status.status == "running"){
                const stoptask = await this.proxmoxService.changeMachineStatus(pve, node.name, vmid, type, Status.stop)
                await this.proxmoxService.waitForTask(pve, node.name, stoptask);
                await this.proxmoxService.deleteMachine(pve, node.name, vmid, type);
            }
            
            // transaction for clean DB from machine and credential
            await this.prisma.$transaction(async (tx) => {
                const machine = await tx.machine.findUnique({
                    where: { vmid },
                    include: {
                        credential: true,
                        requestMachine: true
                    }
                });

                if (!machine) {
                    throw new Error(`Machine with vmid ${vmid} not found`);
                }

                if (machine.credential) {
                    await tx.credential.delete({
                        where: { machine_id: machine.id }
                    });
                }

                await tx.machine.delete({
                    where: { id: machine.id }
                });
            });

            return { success: "Machine deleted successfully" };

        } catch (error: any) {
            this.log.error(`error deleting machine ${vmid}`, error, this.context);
            return { error: error?.message || "Error deleting the machine" };
        }
    }
}
