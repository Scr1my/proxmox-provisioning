import { Module } from '@nestjs/common';
import { RequestController } from 'src/request/request.controller';
import { RequestService } from 'src/request/request.service';
import { MachineModule } from '../machine/machine.module';

@Module({
    imports: [MachineModule],
    controllers: [RequestController],
    providers: [RequestService],
    exports: [RequestService]
})
export class RequestModule {}