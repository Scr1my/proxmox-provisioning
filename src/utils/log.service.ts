import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class LogService {
    private readonly logger: winston.Logger;
    private readonly logFolder = path.join(process.cwd(), process.env.LOG_FOLDER ?? 'logs');

    constructor(
    ) {
        // rotation standard log options
        const dailyTransport = new DailyRotateFile({
            dirname: this.logFolder,
            filename: 'proxmox_provisioning-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxFiles: '30d',
            maxSize: '20m',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json(),
            ),
        });

        // rotation error log options
        const errorTransport = new DailyRotateFile({
            dirname: this.logFolder,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            zippedArchive: true,
            maxFiles: '30d',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json(),
            ),
        });

        // is a better version of console.log()
        const consoleTransport = new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                    const ctx = context ? `[${context}]` : '';
                    const extra = Object.keys(meta).length ? JSON.stringify(meta) : '';
                    return `${timestamp} ${level} ${ctx} ${message} ${extra}`;
                }),
            ),
        });

        // is a filter for message type
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL ?? 'info',
            transports: [dailyTransport, errorTransport, consoleTransport],
        });
    }

    log(message: string, context?: string, meta?: Record<string, unknown>): void {
        this.logger.info(message, { context, ...meta });
    }

    error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void {
        this.logger.error(message, { context, trace, ...meta });
    }

    warn(message: string, context?: string, meta?: Record<string, unknown>): void {
        this.logger.warn(message, { context, ...meta });
    }

    debug(message: string, context?: string, meta?: Record<string, unknown>): void {
        this.logger.debug(message, { context, ...meta });
    }

}
