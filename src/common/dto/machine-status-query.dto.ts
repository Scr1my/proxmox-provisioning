import { Type } from 'class-transformer';
import { IsInt, IsString, IsPositive, IsNotEmpty } from 'class-validator';

export class MachineStatusQueryDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    nodeId: number;

    @IsString()
    @IsNotEmpty({ message: 'type required' })
    type: string;
}