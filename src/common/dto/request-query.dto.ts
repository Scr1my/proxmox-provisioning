import { IsEnum, IsOptional } from 'class-validator';
import { RequestStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class RequestsQueryDto {
    @IsOptional()
    @IsEnum(RequestStatus)
    @Transform(({ value }) => value || undefined) // empty => undefiend
    status?: RequestStatus = RequestStatus.PENDING; // default PENDING
}