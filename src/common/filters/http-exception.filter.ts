import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();
        const status = exception.getStatus();

        // check for API request
        if (req.path.startsWith('/api') || req.headers['accept']?.includes('application/json')) {
            return res.status(status).json({
                statusCode: status,
                message: exception.message,
                timestamp: new Date().toISOString(),
                path: req.path,
            });
        }

        // if render request and not logged in
        if (exception instanceof UnauthorizedException) {
            return res.redirect(302, '/form/login');
        }

        // if render request and not enough permissions
        if (exception instanceof ForbiddenException) {
            return res.redirect('/list/requests');
        }

        //bad request return error for flash
        if (exception instanceof BadRequestException) {
            const origin = req.headers['referer'] || '/';
            const response = exception.getResponse() as any;
            const message = Array.isArray(response.message)
                ? response.message.join(', ')
                : response.message ?? exception.message;
            res.cookie('flash_error', message, { maxAge: 5000, httpOnly: true });
            return res.redirect(origin);
        }

        // Generic fallback
        res.status(status).json({
            statusCode: status,
            message: exception.message,
        });
    }
}