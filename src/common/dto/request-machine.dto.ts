import { IsInt, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestMachineDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    templateId: number;

    @IsString()
    @IsNotEmpty()
    hostname: string;
}