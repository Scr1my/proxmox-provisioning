import {
    IsString, IsNotEmpty, IsIP, Matches,
    IsArray, ValidateNested, ArrayMinSize
} from 'class-validator';
import { CreateNodeDto } from './create-node.dto';
import { Type } from 'class-transformer';


export class CreateEnvironmentDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    token_name: string;

    @IsString()
    @IsNotEmpty()
    token_secret: string;

    @IsString()
    @IsNotEmpty()
    template_folder_id: string;

    @IsString()
    @IsNotEmpty()
    container_storage: string;

    @IsString()
    @IsNotEmpty()
    vm_storage: string;

    @IsIP('4', { message: 'Must be a valid IPv4 address' })
    machine_lan: string;

    // es. "32"
    @Matches(/^([8-9]|[12][0-9]|3[0-2])$/)
    lan_prefix: string;

    @IsIP('4', { message: 'Must be a valid IPv4 address' })
    machine_gateway: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^vmbr\d+$/, { message: 'linux_bridge deve essere nel formato vmbr[number]' })
    linux_bridge: string;

    @IsString()
    @IsNotEmpty()
    ssh_username: string;

    @IsString()
    @IsNotEmpty()
    ssh_password: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateNodeDto)
    nodes: CreateNodeDto[];
}