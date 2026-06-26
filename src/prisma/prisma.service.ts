import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { CypherService } from 'src/utils/cypher.service';
import bcrypt from 'bcrypt';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly baseClient: PrismaClient;
    public readonly client: any;

    constructor() {

        /*----Adapter for DB connection----*/
        const adapter = new PrismaMariaDb({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectionLimit: 5,
            allowPublicKeyRetrieval: true,
        });

        this.baseClient = new PrismaClient({ adapter });

        /*----BaseClient extensions----*/
        this.client = this.baseClient.$extends({
            query: {
                //Automatic hash user password on create and update
                user: {
                    async create({ args, query }) {
                        if (args.data.password) {
                            args.data.password = await bcrypt.hash(args.data.password, 13);
                        }
                        return query(args);
                    },
                    async update({ args, query }) {
                        if (args.data.password && typeof args.data.password === 'string') {
                            args.data.password = await bcrypt.hash(args.data.password, 13);
                        }
                        return query(args);
                    },
                },
            },
        })
        .$extends({
            query: {
                //Automatic AES encrypt environment fileds on create and update
                environment: {
                    async create({ args, query }) {
                        if (args.data.token_secret)
                            args.data.token_secret = CypherService.encrypt(args.data.token_secret, process.env.AES_KEY_API);
                        if (args.data.ssh_password)
                            args.data.ssh_password = CypherService.encrypt(args.data.ssh_password, process.env.AES_KEY_PASSWORD);
                        if (args.data.password)
                            args.data.password = CypherService.encrypt(args.data.password, process.env.AES_KEY_PASSWORD);
                        return query(args);
                    },
                    async update({ args, query }) {
                        if (args.data.token_secret && typeof args.data.token_secret === 'string')
                            args.data.token_secret = CypherService.encrypt(args.data.token_secret, process.env.AES_KEY_API);
                        if (args.data.ssh_password && typeof args.data.ssh_password === 'string')
                            args.data.ssh_password = CypherService.encrypt(args.data.ssh_password, process.env.AES_KEY_PASSWORD);
                        if (args.data.password && typeof args.data.password === 'string')
                            args.data.password = CypherService.encrypt(args.data.password, process.env.AES_KEY_PASSWORD);
                        return query(args);
                    },
                }
            },
            result: {
                //Automatic AES dencrypt environment fileds on select
                environment: {
                    token_secret: {
                        needs: { token_secret: true },
                        compute(env) {
                            try { return CypherService.decrypt(env.token_secret, process.env.AES_KEY_API); }
                            catch { return env.token_secret; }
                        }
                    },
                    ssh_password: {
                        needs: { ssh_password: true },
                        compute(env) {
                            try { return CypherService.decrypt(env.ssh_password, process.env.AES_KEY_PASSWORD); }
                            catch { return env.ssh_password; }
                        }
                    },
                    password: {
                        needs: { password: true },
                        compute(env) {
                            try { return CypherService.decrypt(env.password, process.env.AES_KEY_PASSWORD); }
                            catch { return env.password; }
                        }
                    }
                }
            }
        })
        .$extends({
            query: {
                //Automatic AES encrypt machine password on create and update
                credential: {
                    async create({ args, query }) {
                        if (args.data.password) args.data.password = CypherService.encrypt(args.data.password, process.env.AES_KEY_PASSWORD);
                        return query(args);
                    },
                    async update({ args, query }) {
                        if (args.data.password && typeof args.data.password === 'string')
                            args.data.password = CypherService.encrypt(args.data.password, process.env.AES_KEY_PASSWORD);
                        return query(args);
                    },
                }
            },
            result: {
                //Automatic AES dencrypt machine password on select
                credential: {
                    password: {
                        needs: { password: true },
                        compute(credential) {
                            try { return CypherService.decrypt(credential.password, process.env.AES_KEY_PASSWORD); }
                            catch { return credential.password; }
                        }
                    }
                }
            }
        });
    }

    /*----Getter for expose Prisma modules----*/
    get user() { return this.client.user; }
    get group() { return this.client.group; }
    get group_permission() { return this.client.group_permission; }
    get request() { return this.client.request; }
    get requestMachine() { return this.client.requestMachine; }
    get machine() { return this.client.machine; }
    get credential() { return this.client.credential; }
    get machine_template() { return this.client.machine_template; }
    get machine_type() { return this.client.machine_type; }
    get environment() { return this.client.environment; }
    get environment_node() { return this.client.environment_node; }


    /*----Delegate transaction to baseClient----*/
    $transaction<T>(fn: (tx: any) => Promise<T>, options?: any): Promise<T> {
        return this.baseClient.$transaction(fn, options);
    }

    /*----Module lifecycle----*/
    async onModuleInit() {
        await this.baseClient.$connect();
        console.log('Database connected');
    }

    async onModuleDestroy() {
        await this.baseClient.$disconnect();
        console.log('Database disconnected');
    }
}