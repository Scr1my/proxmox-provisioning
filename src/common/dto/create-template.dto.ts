import { IsString, IsNotEmpty, IsNumberString} from 'class-validator';

export class CreateTemplateDto {
    @IsString()
    @IsNotEmpty({ message: 'Nome template obbligatorio' })
    name: string;

    @IsNumberString({}, { message: 'Base machine non valida' })
    @IsNotEmpty({ message: 'Base machine obbligatoria' })
    base_machine: string;

    @IsNumberString({}, { message: 'RAM non valida' })
    @IsNotEmpty({ message: 'RAM obbligatoria' })
    ram: string;

    @IsNumberString({}, { message: 'Cores non valido' })
    @IsNotEmpty({ message: 'Cores obbligatori' })
    cores: string;
}