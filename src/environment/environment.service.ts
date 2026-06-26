import { Injectable, NotFoundException } from '@nestjs/common';
import { JsonValue } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnvironmentDto } from 'src/common/dto/create-environment.dto';
import { UpdateEnvironmentDto } from 'src/common/dto/update-environment.dto';
import { CreateNodeDto } from 'src/common/dto/create-node.dto';
import { UpdateNodeDto } from 'src/common/dto/update-node.dto';
import { LogService } from 'src/utils/log.service';

@Injectable()
export class EnvironmentService {
    private readonly context = "environment.service";
    constructor(
        private readonly prisma: PrismaService,
        private readonly log: LogService
    ) {}

    /*--------!!Environment Functions!!--------*/

    /*----Get all environments----*/
    async getEnvironments(): Promise<JsonValue> {
        const envs = await this.prisma.environment.findMany();
        return {title: "Environment", envs: envs};
    }

    /*----Get single environment----*/
    async getEnvironmentDetails(envId: number) {
        const env = await this.prisma.environment.findUnique({
            where: {
                id: envId,
            },
            include: {
                environment_nodes: true
            }
        });

        if (!env) {
            throw new NotFoundException(`Environment ${envId} not found`);
        }

        return {title: `${env.name}`, env: env};
    }

    /*----Create new environment----*/
    async createEnvironment(dto: CreateEnvironmentDto) {
        try {
            const env = await this.prisma.environment.create({
                data: {
                    name: dto.name,
                    username: dto.username,
                    password: dto.password,
                    token_name: dto.token_name,
                    token_secret: dto.token_secret,
                    template_folder_id: dto.template_folder_id,
                    container_storage: dto.container_storage,
                    vm_storage: dto.vm_storage,
                    machine_lan: dto.machine_lan,
                    lan_prefix: dto.lan_prefix,
                    machine_gateway: dto.machine_gateway,
                    linux_bridge: dto.linux_bridge,
                    ssh_username: dto.ssh_username,
                    ssh_password: dto.ssh_password,
                    environment_nodes: {
                        create: dto.nodes.map(n => ({ name: n.name, ip: n.ip })),
                    },
                },
            });
            return {success: "Environment creato con successo"}
        } catch {
            return {error: "Errore nella creazine dell'environment"}
        }
        
    }

    /*----Update an environment----*/
    async updateEnvironment(id: number, dto: UpdateEnvironmentDto) {
        return this.prisma.environment.update({
            where: { id },
            data: {
                name:               dto.name,
                username:           dto.username,
                password:           dto.password,
                token_name:         dto.token_name,
                token_secret:       dto.token_secret,
                template_folder_id: dto.template_folder_id,
                container_storage:  dto.container_storage,
                vm_storage:         dto.vm_storage,
                machine_lan:        dto.machine_lan,
                lan_prefix:         dto.lan_prefix,
                machine_gateway:    dto.machine_gateway,
                linux_bridge:       dto.linux_bridge,
                ssh_username:       dto.ssh_username,
                ssh_password:       dto.ssh_password,
            }
        });
    }

    async deleteEnvironment(id: number) {
        const nodes = await this.prisma.environment_node.findMany({ //find all nodes
            where: { environment_id: id },
            select: { id: true }
        });
        const nodeIds = nodes.map(n => n.id);

        const requestMachines = await this.prisma.requestMachine.findMany({ // find all request machines
            where: { environment_node_id: { in: nodeIds } },
            select: { id: true, request_id: true }
        });
        const requestMachineIds = requestMachines.map(rm => rm.id);
        const requestIds = [...new Set(requestMachines.map(rm => rm.request_id))];

        await this.prisma.credential.deleteMany({   // delete all crendential
            where: { machine: { request_Machine_id: { in: requestMachineIds } } }
        });

        await this.prisma.machine.deleteMany({  // delete all machine
            where: { request_Machine_id: { in: requestMachineIds } }
        });

        await this.prisma.requestMachine.deleteMany({   // delete all request machine
            where: { id: { in: requestMachineIds } }
        });

        await this.prisma.request.deleteMany({  // delete all request
            where: {
                id: { in: requestIds },
                request_machines: { none: {} }
            }
        });

        const machineTypeIds = await this.prisma.machine_type.findMany({    // delete template
            where: { environment_node_id: { in: nodeIds } },
            select: { id: true }
        }).then(mt => mt.map(m => m.id));

        await this.prisma.machine_type.deleteMany({ // delete machine type
            where: { environment_node_id: { in: nodeIds } }
        });

        await this.prisma.environment_node.deleteMany({ // delete nodes
            where: { environment_id: id }
        });

        const deleted = await this.prisma.environment.delete({  //delete env
            where: { id }
        });

        return deleted;
    }

    /*--------!!Node Functions!!--------*/

    /*----Create new node----*/
    async createNode(environmentId: number, dto: CreateNodeDto) {
        return this.prisma.environment_node.create({
            data: {
            name:           dto.name,
            ip:             dto.ip,
            environment_id: environmentId,
            }
        });
    }

    /*----Update node----*/
    async updateNode(id: number, dto: UpdateNodeDto) {
        try {
            await this.prisma.environment_node.update({
                where: { id },
                data: {
                    name: dto.name,
                    ip:   dto.ip,
                }
            });
        } catch (error) {
            this.log.error(`error updating node ${dto.name}: `, error, this.context)
            return {error: `error updating node ${dto.name}`}
        }
        this.log.log(`node ${dto.name} updated successfully`, this.context)
        return {success: `node ${dto.name} updated successfully`}
    }

    /*----Delete node----*/
    async deleteNode(id: number) {
        try {
            this.prisma.environment_node.delete({
                where: { id }
            });
        } catch(error) {
            this.log.error(`error deleting node ${id}: `, error, this.context)
            return {error: `error deleting node ${id}`}
        }
        this.log.log(`node ${id} deleted successfully`, this.context);
        return {success: `node ${id} deleted successfully`}
    }
}
