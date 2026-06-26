import { Controller, Get, Render, Param, Query, Res } from '@nestjs/common';
import { RequestService } from '../request/request.service';
import { Response } from 'express';
import { EnvironmentService } from 'src/environment/environment.service';
import { MachineService } from 'src/machine/machine.service';
import { TemplateService } from 'src/template/template.service';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestsQueryDto } from 'src/common/dto/request-query.dto';
import { FlashMessages } from 'src/common/decorators/flash.decorator';

// this controller is just for rendering
@Controller("list")
export class ListController {
    constructor(
        private readonly requestService: RequestService,
        private readonly templateService: TemplateService,
        private readonly environmentService: EnvironmentService,
        private readonly machineService: MachineService,
    ) {}

    /*----Render template list Page----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Get('/templates')
    @Render("list/templates")
    async renderTemplate() {
        const result = await this.templateService.getTemplates();
        return {title: "Templates", ...result}
    }

    /*----Render requests list Page----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Get('/requests')
    @Render("list/requests")
    async renderRequests(
        @Query() query: RequestsQueryDto, 
        @CurrentUser() user,
        @FlashMessages() flash: { error?: string }
    ) {
        const result = await this.requestService.getRequests(query, user);
        return {...result, ...flash}
    }

    /*----Render environments list Page----*/
    @RequirePermission(Permission.CAN_MANAGE_ENVIRONMENT)
    @Get("/environments")
    @Render("list/environments")
    getEnv() {
        return this.environmentService.getEnvironments();
    }

    /*----Render environment details Page----*/
    @RequirePermission(Permission.CAN_MANAGE_ENVIRONMENT)
    @Get("/environment/:id")
    //@Render("envDetails")   // not used for avoid an error in response header with redirect
    async envDetails(@Param("id") id: string, @Res() res: Response) {
        try {
            const data = await this.environmentService.getEnvironmentDetails(Number(id));
            return res.render('list/envDetails', data);
        } catch {
            return res.redirect('/list/env');
        }
    }
    
    /*----Render template list Page----*/
    @RequirePermission(Permission.CAN_MANAGE_OS)
    @Get("/templates")
    @Render("list/templates")
    getTemplate() {
        return this.templateService.getTemplates();
    }

    /*----Render machines list Page----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Get("/machines")
    @Render("list/machines")
    getMachines(
        @CurrentUser() user: any,
    ) {
        return this.machineService.getMachines(user);
    }
}
