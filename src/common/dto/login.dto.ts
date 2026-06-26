import { IsString, IsNotEmpty} from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty({ message: 'username required' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: 'password required' })
    password: string;
}