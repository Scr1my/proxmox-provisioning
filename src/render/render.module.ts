import { Module } from '@nestjs/common';
import { FormController } from 'src/render/form.controller';
import { ListController } from 'src/render/list.controller';
import { EnvironmentModule } from '../environment/environment.module';
import { RequestModule } from '../request/request.module';
import { MachineModule } from '../machine/machine.module';
import { TemplateModule } from '../template/template.module';
import { MainController } from './main.controller';
import { GuideController } from './guide.controller';

@Module({
    imports: [
        EnvironmentModule,
        RequestModule,
        MachineModule,
        TemplateModule
    ],
    controllers: [ListController, FormController, MainController, GuideController],
})
export class RenderModule {}