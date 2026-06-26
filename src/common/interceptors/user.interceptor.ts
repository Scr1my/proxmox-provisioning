import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

// propagates req.user (set by auth guard) to res.locals so HBS templates can access it
@Injectable()
export class UserLocalsInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const res = context.switchToHttp().getResponse();
        const req = context.switchToHttp().getRequest();
        res.locals.user = req.user ?? null;
        return next.handle();
    }
}