import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import LdapAuth from 'ldapauth-fork';
import { Permission } from 'src/common/enums/permission.enum';
import { LogService } from 'src/utils/log.service';

@Injectable()
export class AuthService {
    private readonly context = "auth.service";
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private log: LogService
    ) {}

    /*----Function for Log In ----*/
    async signIn(username: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { username },
            include: { groups: true },
        });

        // if user exist and is LOCAL try check bcrypt
        if (user && user.authType === 'LOCAL') {
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new UnauthorizedException('Credential not valid');

            const groupNames = user.groups.map(g => g.name);
            this.log.log(`user ${user.username} has successfully logged in `, this.context)
            return this.issueJwt(user, groupNames);
        }
        
        // try LDAP authentication
        try {
            const ldapUser = await this.authenticateLdap(username, password);
            // Upsert user into DB or create
            const adGroups: string[] = (ldapUser._groups ?? []).map((g: any) => g.cn);

            const resolvedGroupNames = this.resolveGroup(adGroups);
            const dbUser = await this.prisma.user.upsert({
                where: { username },
                update: {
                    name: ldapUser.givenName || null,
                    surname: ldapUser.sn || null,
                    ldapDn: ldapUser.dn,
                    authType: 'LDAP',
                },
                create: {
                    username,
                    name: ldapUser.givenName || null,
                    surname: ldapUser.sn || null,
                    ldapDn: ldapUser.dn,
                    authType: 'LDAP',
                    password: null,
                },
            });
            await this.syncUserGroups(dbUser.id, resolvedGroupNames);
            this.log.log(`user ${user.username} has successfully logged in `, this.context)
            return this.issueJwt(dbUser, resolvedGroupNames);
        } catch {
            throw new UnauthorizedException('Credential not valid');
        }
    }

    /*----Generate JWT token----*/
    private async issueJwt(user: any, groupNames: string[] = []) {
        const payload = { sub: user.id, username: user.username, authType: user.authType, groups: groupNames,};
        return { access_token: await this.jwtService.signAsync(payload) };
    }

    /*----Authenticate user with LDAP----*/
    private authenticateLdap(username: string, password: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const ldap = new LdapAuth({
                // LDAP Bind
                url: process.env.LDAP_URL,
                bindDN: process.env.LDAP_BIND_DN,
                bindCredentials: process.env.LDAP_BIND_PASSWORD,
                searchBase: process.env.LDAP_SEARCH_BASE,
                // search options
                searchFilter: '(sAMAccountName={{username}})',
                searchAttributes: ['displayName', 'givenName', 'sn', 'mail', 'memberOf'],
                reconnect: false,
                tlsOptions: {
                    rejectUnauthorized: false,
                },
                // Nested groups research
                groupSearchBase: process.env.LDAP_SEARCH_BASE,
                groupSearchFilter: '(member:1.2.840.113556.1.4.1941:={{dn}})', // nested groups (OID LDAP_MATCHING_RULE_IN_CHAIN)
                groupSearchAttributes: ['cn', 'dn'],
                groupDnProperty: 'dn',
            });

            ldap.on('error', (err: any) => {
                ldap.close();
                reject(new Error('Credential not valid'));
            });

            // verify login
            ldap.authenticate(username, password, (err, user) => {
                ldap.close();
                if (err || !user) return reject(err);
                resolve(user);
            });
        });
    }

    /*----resolve AD Group into the application Group----*/
    private resolveGroup(adGroups: string[]): string[] {
        const groups: string[] = [];

        const check = (envVar: string, group: string) => {
            const groupName = process.env[envVar];
            if (groupName && adGroups.includes(groupName)) {
                groups.push(group);
            }
        };

        check('AD_ADMIN_GROUP',     'global-admin');
        check('AD_MANAGER_GROUP',   'manager');
        check('AD_APPROVER_GROUP',  'generic-approver');
        check('AD_REQUESTER_GROUP', 'requester');

        return groups;
    }

    /*----Sync AD user with application group----*/
    private async syncUserGroups(userId: number, groupNames: string[]): Promise<void> {
        // the AD user group can change so there 
        // is this check at every log in
        if (groupNames.length === 0) return;

        // Search in the DB the resolved group names
        const groups = await this.prisma.group.findMany({
            where: { name: { in: groupNames } },
        });

        if (groups.length === 0) return;

        // Disconnect all Groups
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                groups: {
                    disconnect: groups.map(g => ({ id: g.id })),
                },
            },
        });

        // Reconnect all Groups
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                groups: {
                    connect: groups.map(g => ({ id: g.id })),
                },
            },
        });
    }

    /*----Check if user has the required Permissions----*/
    async hasPermission(userId: string, ...permissions: Permission[]): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                groups: {
                    include: { permission: true },
                },
            },
        });

        if (!user) return false;

        return permissions.every((permission) =>
            user.groups.some((group) => group.permission?.[permission] === true),
        );
    }
}