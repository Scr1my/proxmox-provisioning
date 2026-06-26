import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ApiResponseMessage = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
    const res = ctx.switchToHttp().getResponse();

    return {
        success: (message: string, data: any = null, status = 200) => {
            return res.status(status).json({
                success: true,
                message,
                data
            });
        },
        error: (message: string, status = 400, data: any = null) => {
            return res.status(status).json({
                success: false,
                message,
                data
            });
        }
    };
});