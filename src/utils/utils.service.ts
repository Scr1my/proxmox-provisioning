import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Environment, Environment_node, RequestStatus } from '@prisma/client';
import crypto from "crypto";
import ipInt from "ip-to-int";
import { NodeSSH } from "node-ssh"
import { LogService } from './log.service';

@Injectable()
export class UtilsService {
    private readonly context = "utils.service";
    constructor(
        private readonly prisma: PrismaService,
        private readonly log: LogService
    ) {}

    /*----Sanitize IP String----*/
    private sanitizeIPString(ipString: string): string {
        if (!ipString || typeof ipString !== 'string') {
            throw new Error('Invalid IP string');
        }

        const trimmed = ipString.trim().replace(/\s+/g, '');
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;    // simple IP or CIDR

        if (!cidrRegex.test(trimmed)) {
            throw new Error(`Invalid IP format: ${trimmed}`);
        }

        const [ipPart, prefix] = trimmed.split('/');
        const octets = ipPart.split('.');

        for (const octet of octets) {   //  validate octet
            const num = parseInt(octet, 10);
            if (num < 0 || num > 255) {
                throw new Error(`Octet out of range: ${octet}`);
            }
        }

        if (prefix !== undefined) { //  validate prefix
            const prefixNum = parseInt(prefix, 10);
            if (prefixNum < 0 || prefixNum > 32) {
                throw new Error(`Invalid CIDR prefix: ${prefix}`);
            }
        }
        return trimmed;
    }

    /*----Get the range based on Network IP----*/
    private getCidrRange(cidr: string): { first: number; last: number } {
        const sanitizedCidr = this.sanitizeIPString(cidr);
        const [baseIp, prefixLength] = sanitizedCidr.split('/');
        const prefix = parseInt(prefixLength);

        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;    // ~0 invert all 0 bit     << (32 - prefix) shift the position for 0   >>> 0 force final result in unsigned 32
        const network = (ipInt(baseIp).toInt() & mask) >>> 0;   // made 0 the host ip

        const broadcast = (network | (~mask >>> 0)) >>> 0;  // ~mask wildcard    network all host bit 1

        const first = network + 2;      // excludes network address and gateway
        const last  = broadcast - 3;    // excludes broadcast address and FW

        return { first, last };
    }

    /*----Find an avalaible IP in the range----*/
    async getAvalaibleIP(env: Environment) {
        const usedMachines = await this.prisma.machine.findMany({
            where: {
                requestMachine: {
                    environment_node: {
                        environment_id: env.id
                    }
                }
            },
            select: { ip: true },
        });

        const usedIps = new Set<number>(
            usedMachines
                .filter(m => m.ip)
                .map(m => {
                    const clean = this.sanitizeIPString(m.ip);
                    return ipInt(clean).toInt();
                }),
        );

        const cidr = env.machine_lan +  "/" + env.lan_prefix;
        const { first, last } = this.getCidrRange(cidr);

        for (let candidate = first; candidate <= last; candidate++) {
            if (!usedIps.has(candidate)) {
                return ipInt(candidate).toIP();
            }
        }

        throw new Error(
            `No available IP in LAN range ${env.machine_lan} for env ${env.id}`,
        );
    
    }

    /*----Generate a random Password of 16Chars----*/
    generatePassword(length: number = 16) {
        const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
            'abcdefghijklmnopqrstuvwxyz' +
            '0123456789' +
            '!@#$%^&*()-_=+';

        const bytes = crypto.randomBytes(length);
        let password = '';

        for (let i = 0; i < length; i++) {
            password += chars[bytes[i] % chars.length];
        }

        return password;
    }

    /*----Start SSH connection----*/
    async startSSHConnection(node: Environment_node): Promise<NodeSSH> {
        const ssh = new NodeSSH();
        const env = await this.prisma.environment.findUnique({
            where: {id: node.environment_id}
        })
        try {
            await ssh.connect({
                host: node.ip,
                username: env.ssh_username,
                password: env.ssh_password, 
                port: 22,
                hostVerifier: () => true,
            });

        } catch (err) {
            this.log.error('Errore di connessione SSH o esecuzione:', err, this.context);
        } 
        return ssh
    }

    async closeSSHConnection(ssh: NodeSSH) {
        ssh.dispose();
    }

    /*----Change the status of a request (machine or Request)----*/
    async changeRequestStatus(type: 'request' | 'machine', id: number, status: RequestStatus) {
        try {
            if (type === 'machine') {   // update single machine inside a request status 
                const updatedMachine = await this.prisma.requestMachine.update({
                    where: { id },
                    data: { status }
                });

                const allMachines = await this.prisma.requestMachine.findMany({
                    where: { request_id: updatedMachine.request_id }
                });

                const hasAnypending = allMachines.some(m => m.status === 'PENDING' || m.status === 'INPROGRESS');

                // update request status based on the machines of it
                let requestStatus: RequestStatus;
                const data: any = {};
                if (hasAnypending) {
                    data.closed_at = null;
                    requestStatus = 'PENDING';
                } else if (allMachines.every(m => m.status === 'APPROVED')) {
                    data.closed_at = new Date()
                    requestStatus = 'APPROVED';
                } else if (allMachines.every(m => m.status === 'REJECTED')) {
                    requestStatus = 'REJECTED';
                    data.closed_at = new Date()
                } else {
                    requestStatus = "COMPLETED";
                    data.closed_at = new Date()
                }
                data.status = requestStatus;
                await this.prisma.request.update({
                    where: { id: updatedMachine.request_id },
                    data: data
                });
                return { success: `machine ${status} successfully`}
            }
        } catch {
            return { error: `error with machine ${status}`}
        }
        if (type === 'request') {   // update status of entire request (all machine)
            try {
                const updatedRequest = await this.prisma.request.update({
                    where: { id },
                    data: { 
                        status: "INPROGRESS",
                        closed_at: new Date()
                    }
                });

                await this.prisma.requestMachine.updateMany({   // update status of all machine of the request
                    where: { 
                        request_id: updatedRequest.id,
                        status: "PENDING"
                    },
                    data: { status }
                });

                const isClosedStatus = ['APPROVED', 'REJECTED', 'COMPLETED'].includes(status);
                await this.prisma.request.update({
                    where: { id },
                    data: { 
                        status,
                        closed_at: isClosedStatus ? new Date() : null
                    }
                });
            } catch {
                return { error: `error with request ${status}`}
            }
            
            return { success: `request ${status} successfully`}
        }
    }
}
