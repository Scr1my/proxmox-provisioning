import { Controller, Get, Render } from '@nestjs/common';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Permission } from 'src/common/enums/permission.enum';
@Controller()
export class MainController {
    constructor() {}

    /*----Render home page Page----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Get('/')
    @Render("home")
    renderHome() {
        return {title: "Proxmox provisioning"}
    }
}
