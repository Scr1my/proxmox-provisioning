import { forwardRef, Global, Module } from '@nestjs/common';
import { ProxmoxService } from './proxmox.service';
import { UtilsModule } from 'src/utils/utils.module';

@Global()
@Module({
    imports: [forwardRef(() => UtilsModule)],
    providers: [ProxmoxService],
    exports: [ProxmoxService],
})
export class ProxmoxModule {}