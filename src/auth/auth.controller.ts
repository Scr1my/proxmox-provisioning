import { Controller, Post, Body, Res } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthService } from 'src/auth/auth.service';
import { Response } from 'express';
import { LoginDto } from 'src/common/dto/login.dto';

@Controller("auth")
export class AuthController {
    constructor(
        public readonly authService: AuthService
    ) {}

    @Public()
    @Post('/login')
    async postLogin(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response
    ) {
        const { access_token } = await this.authService.signIn(dto.username, dto.password);

        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000,
        });
        
        return { success: true }; 
    }

    @Post('/logout')
    logout(@Res() res: Response) {
        res.clearCookie('access_token');
        return res.redirect('/form/login');
    }
}
