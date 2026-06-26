import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthService } from 'src/auth/auth.service';
import { Permission } from '../enums/permission.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector, 
        private readonly prisma: PrismaService,
        private readonly authService: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );
        // No permission required -> pass
        if (!requiredPermissions || requiredPermissions.length === 0) return true;

        const { user } = context.switchToHttp().getRequest();
        
        // Load all user group permission
        const userWithGroups = await this.prisma.user.findUnique({
            where: { id: user.sub },
            include: {
                groups: {
                    include: { permission: true },
                },
            },
        });

        if (!userWithGroups) throw new ForbiddenException();

        // Verify atleast one group have right permission
        const hasPermission = await this.authService.hasPermission(
            user.sub,
            ...requiredPermissions,
        );

        if (!hasPermission) throw new ForbiddenException('Permessi insufficienti');
        return true;
    }
}