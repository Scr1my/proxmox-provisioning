import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from 'src/proxmox/proxmox.service';
import { Environment, Environment_node } from '@prisma/client';
import * as path from 'path';
import { promises as fs } from 'fs';
import { UtilsService } from '../utils/utils.service';
import { toMachineType } from 'src/common/enums/machine-type.enum';
import { CreateTemplateDto } from 'src/common/dto/create-template.dto';
import { CreateTemplateTypeDto } from 'src/common/dto/create-template-type.dto';
import { LogService } from '../utils/log.service';

@Injectable()
export class TemplateService {
    private readonly context = "template.service";
    constructor(
        private readonly proxmoxService: ProxmoxService,
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly log: LogService
    ) {}

    /*----Get the necessary for render template type form----*/
    async getTemplateType(): Promise<Record<string, any>> {
        const envs = await this.prisma.environment.findMany();
        return {title: "new Template", envs: envs};
    }

    /*----Get all template type----*/
    async getMachineTypes(): Promise<Record<string, any>> {
        const machines = await this.prisma.machine_type.findMany();
        const lxcMachines = machines.filter(m => m.type === 'LXC');
        const vmMachines = machines.filter(m => m.type === 'VM');
        this.log.log("get all os LXC and vm", this.context);
        return { title: "new Template", lxcMachines, vmMachines };
    }

    /*----Get all LXC templates and ISO----*/
    async getOS(envId : number) {
        const { pve, env, node} = await this.proxmoxService.getProxmoxConnection({envId});

        const LXCOSTemplates = await this.proxmoxService.listDownloadedLXCTemplates(pve, node.name, env.template_folder_id);
        const VMISOImages = await this.proxmoxService.listISOImages(pve, node.name, env.template_folder_id);
        this.log.log("get all LXC template and ISO", this.context);
        return { LXCOSTemplates, VMISOImages }
    }

    /*----Create new template type----*/
    async createTemplateType(dto: CreateTemplateTypeDto) {
        const envId: number = Number(dto.env);
        const templateOS: string = dto.os;
        const templateName: string = dto.name;

        const { pve, env, node } = await this.proxmoxService.getProxmoxConnection({ envId });
        const vmid = await this.proxmoxService.getVmid(pve);

        const isLXC = templateOS.includes('vztmpl/');   // check if LXC with template name
        let type: string;
        let osFamily: string;
        const config: any = {
            vmid,
            start: 0
        };

        if (isLXC) {    // LXC config
            type = 'LXC';
            osFamily = "LINUX"
            config.ostemplate = templateOS;
            config.hostname = templateName;
            config.password = process.env.ADMIN_PASSWORD ?? 'Password&1';
            config.cores = 1;
            config.memory = 512;
            config.swap = 512;
            config.rootfs = `${env.container_storage}:8`;
            config.net0 = 'name=eth0,bridge=vmbr0,ip=dhcp';
            config.unprivileged = 1;

        } else {    // VM config
            type = 'VM';
            const isoPath = `/mnt/pve/${env.template_folder_id}/${templateOS}`;
            osFamily = await this.detectOsFamilyFromIso(node, env,  isoPath);
            const ostype = osFamily === "LINUX" ? "126" : "win10";

            config.name = templateName;
            config.memory = 2048;
            config.cores = 2;
            config.ostype = ostype;
            config.ide2 = `${templateOS},media=cdrom`;
            config.virtio0 = `${env.vm_storage}:10`;
            config.net0 = 'virtio,bridge=vmbr0';
            config.boot = 'order=ide2;virtio0';
        }

        this.log.log("creating new template type...", this.context);
        try {
            const createTask = await this.proxmoxService.createMachine(pve, node.name, toMachineType(type), config);
            await this.proxmoxService.waitForTask(pve, node.name, createTask);
            await this.proxmoxService.convertMachineToTemplate(pve, node.name, vmid, toMachineType(type));
        } catch (error) {
            this.log.error("error creating template type", error, this.context);
            return {error: "error creating template type"};
        }

        const dbTemplate = await this.prisma.machine_type.create({
            data: {
                environment_node_id: node.id,
                vmid,
                name: templateName,
                os: templateOS,
                type,
                os_family: osFamily
            },
        });

        this.log.log(`Template Type ${dbTemplate} created successfully`, this.context);
        return {success: "Template Type created successfully"};
    }

    /*----Create new template----*/
    async createTemplate(dto: CreateTemplateDto, file) {
        const templateName : string = dto.name;
        const baseMachine = 
            await this.prisma.machine_type.findUnique({
                where: { id: Number(dto.base_machine) },
                include: { environment_node: { include: { environment: true }}}});
        const templateRAM : number = Number(dto.ram);
        const templateCores : number = Number(dto.cores);

        let scriptFileName = ""
        if (file) {
            scriptFileName = `${baseMachine.environment_node.environment.name}-${templateName}.sh`
        
            const basePath = path.join(process.cwd(), process.env.PROVISIONING_SCRIPTS_FOLDER);
            const finalPath = path.join(basePath, scriptFileName);
            await fs.writeFile(finalPath, file.buffer);
        }        

        this.log.log("Creating template...", this.context);
        try {
            const newTemplate = await this.prisma.machine_template.create({
                data: {
                    name: templateName,
                    cores: templateCores,
                    ram: templateRAM,
                    machine_type_id: baseMachine.id,
                    provisiong_script: scriptFileName
                }
            })
        } catch (error) {
            this.log.error("error creating template", error, this.context);
            return {error: "error creating template"}
        }
        
        this.log.log("template successfully created", this.context);
        return {success: "template successfully created"}
    }

    /*----Get all templates----*/
    async getTemplates() {
        const machine_types = await this.prisma.machine_type.findMany({});
        const machine_templates = await this.prisma.machine_template.findMany({
            include: {
                machine_type: true
            }
        });
        this.log.log("get all os and template", this.context);
        return {machine_types, machine_templates}
    }

    /*----Read the ISO to get OS Family----*/
    async detectOsFamilyFromIso(node: Environment_node, env: Environment, isoPath: string): Promise<'LINUX' | 'WINDOWS'> {
        const ssh = await this.utils.startSSHConnection(node);
        const folderName = Date.now();
        isoPath = isoPath.replace(`/${env.template_folder_id}:iso`, "/template/iso");
    
        try {
            this.log.log(`checking iso ${isoPath} for os family...`, this.context);
            const mountResult = await ssh.execCommand(  // mount the iso file on pve node
                `mkdir -p /mnt/${folderName}
                mount -t udf -o loop,ro ${isoPath} /mnt/${folderName}`
            );
            const fileResult = await ssh.execCommand(   // check the presence of certains file inside the iso
                `ls "/mnt/${folderName}" -f 2>/dev/null | grep -iE "autorun\\.inf|bootmgr$|bootmgr\\.efi|setup\\.exe"`
            );
            const umountResult = await ssh.execCommand( // unmount the iso file on pve node
                `umount /mnt/${folderName}
                rmdir /mnt/${folderName}`
            );

            const foundFiles = fileResult.stdout.trim().split('\n').filter(Boolean);

            return foundFiles.length === 4 ? 'WINDOWS' : 'LINUX';
        } catch (error) {
            this.log.error(`error checking iso ${isoPath}: `, error,  this.context);
        }
        finally {
            this.log.log(`iso ${isoPath} successfully checked`, this.context);
            await this.utils.closeSSHConnection(ssh);
        }
    }
}
