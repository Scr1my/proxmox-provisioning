import { Controller, Get, Post, ParseEnumPipe, Body, Param, Query, Delete } from '@nestjs/common';
import { ApiResponseMessage } from 'src/common/decorators/api-response-message.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { ChangeMachineStatusDto } from 'src/common/dto/change-machine-status.dto';
import { deleteMachineDto } from 'src/common/dto/delete-machine.dto';
import { MachineStatusQueryDto } from 'src/common/dto/machine-status-query.dto';
import { NoVNCDto } from 'src/common/dto/novnc.dto';
import { toMachineType } from 'src/common/enums/machine-type.enum';
import { Permission } from 'src/common/enums/permission.enum';
import { Status } from 'src/common/enums/status.enum';
import { MachineService } from 'src/machine/machine.service';

@RequirePermission(Permission.CAN_REQUEST)
@Controller("api/machine")
export class MachineController {
    constructor(
        private readonly machineService: MachineService
    ) {}

    /*----get url and ticket for noVNC connection----*/
    @Post("/:vmid/novnc")
    postNoVNC(@Param('vmid') vmid: string, @Body() dto: NoVNCDto) {
        return this.machineService.noVNC(Number(vmid), dto);
    }

    /*----Delete machine----*/
    @RequirePermission(Permission.CAN_APPROVE_SPECIFIC, Permission.CAN_APPROVE_GENERIC)
    @Delete('/:vmid/delete')
    async deleteMachine(
        @Param('vmid') vmid: string,
        @Body() dto: deleteMachineDto,
        @ApiResponseMessage() api: {
            success: (m: string, data?: any, status?: number) => any;
            error: (m: string, status?: number, data?: any) => any;
        }
    ) {
        const result = await this.machineService.deleteMachine(Number(vmid), dto);
        if (result.success) { return api.success(result.success); }
        
        return api.error(result.error || 'Errore durante la cancellazione', 400);
    }

    /*----Get machine Status----*/
    @Get('/:vmid/status')
    async getMachineStatus(
        @Param('vmid') vmid: string,
        @Query() query: MachineStatusQueryDto,
        @CurrentUser() user
    ) {
        return this.machineService.getMachineStatus(query.nodeId, Number(vmid), toMachineType(query.type), user);
    }

    /*----Change machine Status----*/
    @Post('/:vmid/:status')
    async changeMachineStatus(
        @Param('vmid') vmid: string,
        @Param('status', new ParseEnumPipe(Status)) status: Status,
        @Body() dto: ChangeMachineStatusDto,
        @CurrentUser() user
    ) {
        return this.machineService.changeMachineStatus(Number(vmid), dto, status, user);
    }
}
