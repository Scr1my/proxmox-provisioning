import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FlashRedirect } from 'src/common/decorators/flash-redirect.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { CreateTemplateTypeDto } from 'src/common/dto/create-template-type.dto';
import { CreateTemplateDto } from 'src/common/dto/create-template.dto';
import { Permission } from 'src/common/enums/permission.enum';
import { TemplateService } from 'src/template/template.service';

@Controller("/template")
export class templateController {
    constructor(
        private readonly templateService: TemplateService,
    ) {}

    /*----Get Requests----*/

    /*----Get OS avalaible for template----*/
    @RequirePermission(Permission.CAN_MANAGE_OS)
    @Get("/:envId/OS")  // search avalaible os in env
    getOS(@Param("envId") envId: string) {
        return this.templateService.getOS(Number(envId));
    }

    /*----Post Requests----*/

    /*----Create New template type----*/
    @RequirePermission(Permission.CAN_MANAGE_OS)
    @Post("/type")
    async postTemplateType( 
        @Body() dto: CreateTemplateTypeDto, 
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.templateService.createTemplateType(dto);
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Create New template----*/
    @RequirePermission(Permission.CAN_MANAGE_TEMPLATE)
    @Post()
    @UseInterceptors(FileInterceptor('script'))
    async postTemplate(
        @Body() dto: CreateTemplateDto, 
        @UploadedFile() file: Express.Multer.File,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.templateService.createTemplate(dto, file);
        result.success ? flash.success(result.success) : flash.error(result.error);
    }
}
