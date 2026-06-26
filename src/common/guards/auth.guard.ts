import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService, private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // if public pass
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(), context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest();

        // first read header then cookie
        const token =
            request.headers.authorization?.split(' ')[1] ??
            request.cookies?.['access_token'];

        if (!token) throw new UnauthorizedException();

        try {
            // check secret
            request['user'] = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
        } catch {
            throw new UnauthorizedException();
        }
        return true;
    }
}