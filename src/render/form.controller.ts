import { Controller, Get, Render} from '@nestjs/common';
import { RequestService } from '../request/request.service';
import { TemplateService } from 'src/template/template.service';
import { FlashMessages } from 'src/common/decorators/flash.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import { Public } from 'src/common/decorators/public.decorator';

// this controller is just for rendering
@Controller("form")
export class FormController {
    constructor(
        private readonly requestService: RequestService,
        private readonly templateService: TemplateService,
    ) {}

    /*----Render Login Page----*/
    @Public()
        @Get("/login")
        @Render("form/login")
        getLogin(@FlashMessages() flash: { error?: string }) {
        return {title: "Login", ...flash};
    }

    /*----Render create environment form Page----*/
    @RequirePermission(Permission.CAN_MANAGE_ENVIRONMENT)
    @Get("/environment")
    @Render("form/environment")
    getEnv (@FlashMessages() flash: { success?: string, error?: string }) {
        return { title: "Environment", ...flash };
    }

    /*----Render create request form Page----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Get("/request")
    @Render("form/request")
    async getRequest(@FlashMessages() flash: { success?: string, error?: string }) {
        const data = await this.requestService.getRequest();
        return { ...data, ...flash };
    }

    /*----Render create template type form Page----*/
    @RequirePermission(Permission.CAN_MANAGE_OS)
    @Get("/templateType")
    @Render("form/templateType")
    async getTemplateType(@FlashMessages() flash: { success?: string, error?: string }) {
        const data = await this.templateService.getTemplateType();
        return { ...data, ...flash };
    }

    /*----Render create Template form Page----*/
    @RequirePermission(Permission.CAN_MANAGE_TEMPLATE)
    @Get("/template")
    @Render("form/template")
    async getNewTemplate(@FlashMessages() flash: { success?: string, error?: string }) {
        const data = await  this.templateService.getMachineTypes();
        return { ...data, ...flash };
    }
}
