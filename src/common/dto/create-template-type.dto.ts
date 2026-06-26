import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class CreateTemplateTypeDto {
    @IsNumberString({}, { message: 'Environment non valido' })
    @IsNotEmpty({ message: 'Environment obbligatorio' })
    env: number;

    @IsString()
    @IsNotEmpty({ message: 'Sistema operativo obbligatorio' })
    os: string;

    @IsString()
    @IsNotEmpty({ message: 'Nome template obbligatorio' })
    name: string;
}