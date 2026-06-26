import { Controller, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { EnvironmentService } from 'src/environment/environment.service';
import { CreateEnvironmentDto } from 'src/common/dto/create-environment.dto';
import { UpdateEnvironmentDto } from 'src/common/dto/update-environment.dto';
import { CreateNodeDto } from 'src/common/dto/create-node.dto';
import { FlashRedirect } from 'src/common/decorators/flash-redirect.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import { UpdateNodeDto } from 'src/common/dto/update-node.dto';


@RequirePermission(Permission.CAN_MANAGE_ENVIRONMENT)
@Controller("environment")
export class EnvironmentController {
    constructor(
        private readonly environmnentService: EnvironmentService,
    ) {}

    /*--------!!Environment Functions!!--------*/

    /*----Create new environment----*/
    @Post()
    async postEnv(
        @Body() dto: CreateEnvironmentDto,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.environmnentService.createEnvironment(dto);
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Update environment fields----*/
    @Put("/:id")
    async updateEnvironment(
        @Param('id') id: string, 
        @Body() dto: UpdateEnvironmentDto,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.environmnentService.updateEnvironment(Number(id), dto);
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    @Delete("/:id")
    async deleteEnvironment(
        @Param('id') id: string,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.environmnentService.deleteEnvironment(Number(id));
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*--------!!Node Functions!!--------*/

    /*----Create new node----*/
    @Post("/node/:envId")
    async createNode(
        @Param('envId') envId: string, 
        @Body() dto: CreateNodeDto,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.environmnentService.createNode(Number(envId), dto);
        result.success ? flash.success(result.success) : flash.error(result.error);
    } 

    /*----Update node fields----*/
    @Put("/node/:id")
    async updateNode(
        @Param('id') id: string, @Body() dto: UpdateNodeDto,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.environmnentService.updateNode(Number(id), dto);
        result.success ? flash.success(result.success) : flash.error(result.error);
    }

    /*----Delete node----*/
    @Delete("/node/:id") 
    async deleteNode(
        @Param('id') id: string,
        @FlashRedirect() flash: { success: (m: string) => void, error: (m: string) => void }
    ) {
        const result = await this.environmnentService.deleteNode(Number(id));
        result.success ? flash.success(result.success) : flash.error(result.error);
    }
}
