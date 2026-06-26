import { Controller, Get, Render } from '@nestjs/common';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Permission } from 'src/common/enums/permission.enum';

@Controller("guide")
export class GuideController {
    constructor() {}

    /*----Render user guide for student----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Get('/user')
    @Render("guide/user")
    userGuide() {
        return {title: "User Guide"}
    }

    @RequirePermission(Permission.CAN_MANAGE_TEMPLATE)
    @Get('/manager')
    @Render("guide/manager")
    managerGuide() {
        return {title: "Manager Guide"}
    }

    @RequirePermission(Permission.CAN_MANAGE_ENVIRONMENT)
    @Get('/admin')
    @Render("guide/admin")
    adminGuide() {
        return {title: "Admin Guide"}
    }
}
