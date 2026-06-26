import { forwardRef, Global, Module } from '@nestjs/common';
import { ProxmoxModule } from 'src/proxmox/proxmox.module';
import { LogService } from 'src/utils/log.service';
import { UtilsService } from 'src/utils/utils.service';

@Global()
@Module({
    imports: [forwardRef(() => ProxmoxModule)],
    providers: [UtilsService, LogService],
    exports: [UtilsService, LogService],
})
export class UtilsModule {}