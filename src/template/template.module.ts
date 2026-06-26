import { Module } from '@nestjs/common';
import { templateController } from 'src/template/template.controller';
import { TemplateService } from 'src/template/template.service';

@Module({
    controllers: [templateController],
    providers: [TemplateService],
    exports: [TemplateService]
})
export class TemplateModule {}