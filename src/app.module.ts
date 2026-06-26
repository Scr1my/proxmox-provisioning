import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StartupService } from './startup/startup.service';;
import { ProxmoxModule } from './proxmox/proxmox.module';
import { UtilsModule } from './utils/utils.module';
import { AuthModule } from './auth/auth.module';
import { MachineModule } from './machine/machine.module';
import { EnvironmentModule } from './environment/environment.module';
import { RequestModule } from './request/request.module';
import { RenderModule } from './render/render.module';
import { TemplateModule } from './template/template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env',
    }),
    PrismaModule,
    UtilsModule,
    ProxmoxModule,
    AuthModule,
    MachineModule,
    EnvironmentModule,
    RequestModule,
    RenderModule,
    TemplateModule
  ],
  controllers: [],
  providers: [StartupService],
})
export class AppModule {}