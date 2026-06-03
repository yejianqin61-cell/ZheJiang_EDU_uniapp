import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { FileLogger } from './common/file-logger';
import { WxPayClient } from './modules/payment/wxpay.client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new FileLogger(),
  });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableCors();

  await app.listen(3000);

  // Pre-fetch WeChat Pay platform certificates (non-blocking)
  const wxPay = app.get(WxPayClient);
  wxPay.refreshPlatformCerts().catch(() => {});
}
bootstrap();
