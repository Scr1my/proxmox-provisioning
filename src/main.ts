import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { engine } from 'express-handlebars';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ValidationPipe } from '@nestjs/common';
import { UserLocalsInterceptor } from './common/interceptors/user.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 3000;
  app.use(cookieParser());
  app.useGlobalInterceptors(new UserLocalsInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,  // remove extra field
    forbidNonWhitelisted: true, // throw error with extra field
    transform: true,  // convert automatic field type
  }));

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: join(__dirname, '..', 'views/layouts'),
    partialsDir: join(__dirname, '..', 'views/partials'),
    helpers: {
      eq: (a: any, b: any) => a === b,
      arr: (...args: any[]) => args.slice(0, -1), // HBS pass an optionsObject
      hasGroup: (user: any, groups: string[]) => {
        if (!user?.groups) return false;
        return groups.some(g => user.groups.includes(g));
      },
      formatDate: (date) => {
        if (!date) return "-";
        const d = new Date(date);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
  }));

  app.setViewEngine('hbs');
  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
