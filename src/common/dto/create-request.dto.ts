import { IsInt, IsPositive, IsString, IsArray, ValidateNested, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestMachineDto } from './request-machine.dto';

export class CreateRequestDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    approverId: number;

    @IsString()
    @IsOptional()
    observation: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => RequestMachineDto)
    machines: RequestMachineDto[];
}