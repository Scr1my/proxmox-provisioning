import { IsString, IsNotEmpty, IsIP} from 'class-validator';

export class CreateNodeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsIP()
    ip: string;
}