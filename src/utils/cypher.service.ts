import { Injectable } from '@nestjs/common';
import crypto from "crypto";

@Injectable()
export class CypherService {
    private static readonly IV_LENGTH = 16; // Initialition vector length
    constructor() {}

    static encrypt(text: string, aesKey: string): string {
        const key = Buffer.from(aesKey, 'hex'); // covert the key from hex to bytes
        const iv = crypto.randomBytes(CypherService.IV_LENGTH); // generate IV
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv); // generate cipher
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]); // encrypt the data
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`; 
    }

    static decrypt(text: string, aesKey: string): string {
        const key = Buffer.from(aesKey, 'hex');
        const [ivHex, encryptedHex] = text.split(':'); // separate IV from encrypted data
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);// generate decipher
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    }
}
