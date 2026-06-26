import { Controller, Post, Body, Param } from '@nestjs/common';
import { RequestService } from './request.service';
import { MachineService } from 'src/machine/machine.service';
import { UtilsService } from 'src/utils/utils.service';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateRequestDto } from 'src/common/dto/create-request.dto';
import { FlashRedirect } from 'src/common/decorators/flash-redirect.decorator';


@Controller()
export class RequestController {
    constructor(
        private readonly requestService: RequestService,
        private readonly machineService: MachineService,
        private readonly utils: UtilsService
    ) {}

    /*----Create New request----*/
    @RequirePermission(Permission.CAN_REQUEST)
    @Post("/request")
    async postRequest(
        @Body() dto: CreateRequestDto,
        @CurrentUser() user,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.requestService.createRequest(dto, user);
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Approve single machine----*/
    @RequirePermission(Permission.CAN_APPROVE_SPECIFIC)
    @Post("/approveMachine/:id")
    async approveMachine(
        @Param("id") id: string,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.machineService.createMachine(Number(id));
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Reject single machine----*/
    @RequirePermission(Permission.CAN_APPROVE_SPECIFIC)
    @Post("/rejectMachine/:id")
    async rejectMachine(
        @Param("id") id: string,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.utils.changeRequestStatus("machine", Number(id), "REJECTED");
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Approve request----*/
    @RequirePermission(Permission.CAN_APPROVE_SPECIFIC)
    @Post("/approveRequest/:id")
    async approveRequest(
        @Param("id") id: string,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.requestService.approveRequest(Number(id));
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Reject request----*/
    @RequirePermission(Permission.CAN_APPROVE_SPECIFIC)
    @Post("/rejectRequest/:id")
    async rejectrequest(
        @Param("id") id: string,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.utils.changeRequestStatus("request", Number(id), "REJECTED");
        result.success ? flash.success(result.success) : flash.error(result.error);
    }
}
