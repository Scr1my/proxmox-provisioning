import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const FlashRedirect = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();

    return {
        success: (message: string) => {
            res.cookie('flash_success', message, { maxAge: 5000, httpOnly: true });
            res.redirect(req.headers['referer'] || '/');
        },
        error: (message: string) => {
            res.cookie('flash_error', message, { maxAge: 5000, httpOnly: true });
            res.redirect(req.headers['referer'] || '/');
        },
    };
});