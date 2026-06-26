import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class ChangeMachineStatusDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    nodeId: number;

    @IsString()
    @IsNotEmpty({ message: 'type required' })
    type: string;
}