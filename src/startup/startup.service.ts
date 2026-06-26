import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Group, User } from '@prisma/client';
import { GroupPrivileges } from "../common/interface/privilege.interface";
import { LogService } from 'src/utils/log.service';


@Injectable()
export class StartupService implements OnModuleInit {
    private readonly context = "startup.service";
    constructor(
        private readonly prisma: PrismaService,
        private readonly log: LogService
    ) {}

    async onModuleInit() {
        this.log.log("Running startup checks...", this.context);

        // check necessary users and groups
        const admin = await this.checkUser("admin");
        const genericApprover = await this.checkUser("generic-approver");

        const adminGroup = await this.checkGroup(admin, "global-admin");
        const genericApproverGroup = await this.checkGroup(genericApprover, "generic-approver");
        const requesterGroup = await this.checkGroupPresence("requester");
        const managerGroup = await this.checkGroupPresence("manager");

        // create privilege objects
        const adminPrivileges: GroupPrivileges = {
        can_request: true,
        can_approve_specific: true,
        can_approve_generic: true,
        can_manage_environment: true,
        can_manage_template: true,
        can_manage_OS: true
        };

        const approverPrivilege: GroupPrivileges = {
        can_approve_generic: true,
        };

        const requesterPrivilege: GroupPrivileges = {
        can_request: true,
        };

        const managerPrivile: GroupPrivileges = {
        can_approve_specific: true,
        can_manage_template: true,
        can_request: true
        };

        // set privilege to groups
        const adminGroupPermission = await this.setGroupPrivileges(adminGroup, adminPrivileges);
        const genericApproverPermission = await this.setGroupPrivileges(genericApproverGroup, approverPrivilege);
        const requesterGroupPermission = await this.setGroupPrivileges(requesterGroup, requesterPrivilege);
        const managerGroupPermission = await this.setGroupPrivileges(managerGroup, managerPrivile);
    }

    /*----Check if user exist or create----*/
    async checkUser(username: string) {
        try {
            const existUser = await this.prisma.user.findUnique({
                where: {
                username: username,
                },
            });

            if (!existUser) {
                this.log.log(`${username} user not found. Creating...`, this.context);

                const newUser = await this.prisma.user.create({
                    data: {
                        username: username,
                        password: process.env.ADMIN_PASSWORD || 'Password&1',
                    },
                });

                this.log.log(`${username} user created successfully`, this.context);
                return newUser
            } else {
                this.log.log(`${username} user already exists`, this.context);
                return existUser
            }
        } catch (error) {
            this.log.error(`Error during ${username} user check:`, error, this.context);
        }
    }

    /*----Check if group exist or create----*/
    async checkGroup(user: User, groupName: string): Promise<Group> {
        try {
        const group = await this.checkGroupPresence(groupName);

        const isMember = await this.prisma.group.findFirst({
            where: {
                id: group.id,
                users: {
                    some: {
                    id: user.id
                    }
                }
            }
        });
        
        if(!isMember) { 
            return await this.prisma.group.update({
                where: { id: group.id },
                data: {
                    users: {
                        connect: { id: user.id }
                    }
                }
            });
        }

        return group
        } catch (error) {
            this.log.error('Error during admin user check:', error, this.context);
        }
    }

    /*----Check if user is in the group or add----*/
    async checkGroupPresence(groupName: string): Promise<Group> {
        try {
            const existGroup = await this.prisma.group.findUnique({
                where: {
                    name: groupName,
                },
                include: {
                    permission: true
                }
            });

            if (!existGroup) {
                this.log.log(`${groupName} group not found. Creating...`, this.context);

                const newGroup = await this.prisma.group.create({
                    data: {
                        name: groupName
                    },
                    include: {
                        permission: true
                    }
                });
                this.log.log(`${groupName} group created successfully`, this.context);
                return newGroup
            } else {
                this.log.log(`${groupName} group already exists`, this.context);
                return existGroup
            }
        } catch (error) {
            this.log.error(`Error:`, error, this.context);
        }
    }

    /*----Set the privilege to a group----*/
    async setGroupPrivileges(group: Group, privileges: GroupPrivileges){
        return await this.prisma.group_permission.upsert({
            where: {
                group_id: group.id
            },
            update: {
                ...privileges
            },
            create: {
                ...privileges,
                group_id: group.id
            }
        });
    }
}