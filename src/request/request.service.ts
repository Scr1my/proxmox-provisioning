import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UtilsService } from '../utils/utils.service';
import { LogService } from '../utils/log.service';
import { MachineService } from '../machine/machine.service';
import { AuthService } from '../auth/auth.service';
import { Permission } from 'src/common/enums/permission.enum';
import { CreateRequestDto } from 'src/common/dto/create-request.dto';

@Injectable()
export class RequestService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly log: LogService,
        private readonly machineService: MachineService,
        private readonly auth: AuthService
    ) {}
    
    /*----Get the necessary for render request form----*/
    async getRequest() {
        const approvers = await this.getApproverList();
        const templates = await this.getAvalaibleMachineTemplate();
        return {title: "Request", approvers, templates};
    }

    /*----Get all requests----*/
    async getRequests(query, user) {
        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        const canApproveGeneric = await this.auth.hasPermission(user.sub, Permission.CAN_APPROVE_GENERIC);
        const canRequest = await this.auth.hasPermission(user.sub, Permission.CAN_REQUEST);
        const canApproveSpecific = await this.auth.hasPermission(user.sub, Permission.CAN_APPROVE_SPECIFIC);

        if (!canApproveGeneric) {
            const orConditions: any[] = [];

            if (canRequest) {
                orConditions.push({ requester_id: user.sub });
            }

            if (canApproveSpecific) {
                orConditions.push({ approver_id: user.sub });
            }

            if (orConditions.length > 0) {
                where.OR = orConditions;
            }
        }

        const requests = await this.prisma.request.findMany({
            orderBy: { id: "desc" },
            where,
            include: {
                requester: true,
                approver: true,
                request_machines: { include: { machine_template: true } }
            }
        });

        return { requests };
    }

    /*----Create a new Request----*/
    async createRequest(dto: CreateRequestDto, user) {
        const requester_id: number = user.sub;
        const approver_id: number = dto.approverId;
        const observation: string = dto.observation;
        const machines = dto.machines;

        try {
            await this.prisma.$transaction(async (tx) => {
                const templates: any[] = [];
                for (const m of machines) { // find the templates objects
                    const template = await tx.machine_template.findUnique({
                        where: { id: m.templateId },
                        select: {
                            machine_type: {
                                select: { environment_node_id: true },
                            },
                        },
                    });
                    templates.push(template);
                }

                const newRequest = await tx.request.create({
                    data: { requester_id, approver_id, observation },
                });

                for (let i = 0; i < machines.length; i++) {
                    await tx.requestMachine.create({
                        data: {
                            request_id: newRequest.id,
                            machine_template_id: machines[i].templateId,
                            hostname: machines[i].hostname,
                            environment_node_id: templates[i]?.machine_type.environment_node_id,
                        },
                    });
                }
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                //throw new ConflictException(`One or more hostnames are already in use`);
                return {error: "Error during request"};
            }
            throw e;
        }

        return {success: "request sent successfully"};
    }

    /*----Get the list of user with approve permissions----*/
    async getApproverList() {
        const approvers = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
            },
            where: {
                username: {
                    not: "admin"
                },
                groups: {
                    some: {
                        permission: {
                            OR: [
                                { can_approve_generic: true },
                                { can_approve_specific: true }
                            ]
                        }
                    }
                }
            },
            orderBy: {
                id: 'asc' // for having generic approver as default
            }
        });
        return approvers
    }

    /*----Get the machine template----*/
    async getAvalaibleMachineTemplate() {
        const templates = await this.prisma.machine_template.findMany({
            select: {
                id: true,
                name: true,
            }
        });
        return templates
    }

    /*----Appreve the request----*/
    async approveRequest(requestId: number) {
        const requestMachines = await this.prisma.requestMachine.findMany({
            where: {
                request_id: Number(requestId),
                status: 'PENDING',
            },
            select: { id: true },
        });
        
        if (!requestMachines.length) {
            return { error: `No pending machines found for request ${requestId}` };
        }

        const results = [];
        for (const rm of requestMachines) {
            const result = await this.machineService.createMachine(rm.id);
            results.push(result);
        }

        await this.utils.changeRequestStatus('request', Number(requestId), 'APPROVED');

        return { success: `${results.length} machines created successfully` };
    }
}
