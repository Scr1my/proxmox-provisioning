import { IsInt, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class deleteMachineDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    nodeId: number;

    @IsString()
    @IsNotEmpty()
    type: string;
}