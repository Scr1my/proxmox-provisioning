import { SetMetadata } from '@nestjs/common';
import { Permission } from 'src/common/enums/permission.enum';
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: Permission[]) => 
    SetMetadata(PERMISSIONS_KEY, permissions);