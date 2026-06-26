import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const FlashMessages = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();

    const success = req.cookies?.flash_success;
    const error   = req.cookies?.flash_error;

    res.clearCookie('flash_success');
    res.clearCookie('flash_error');

    return { success, error };
});