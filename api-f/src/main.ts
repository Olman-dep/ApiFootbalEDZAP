import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Football EDZAP')
    .setDescription('Documentación de la API de fútbol')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`Servidor en: http://localhost:${port}`);
  console.log(`Swagger en: http://localhost:${port}/api/docs`);
}

bootstrap();