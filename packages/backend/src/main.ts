import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs'; // Import pro práci se souborovým systémem
import * as path from 'path'; // Import pro práci s cestami

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Odstraní vlastnosti, které nejsou v DTO
    forbidNonWhitelisted: true, // Vyhodí chybu, pokud jsou přítomny vlastnosti navíc
    transform: true, // Automaticky transformuje payload na instance DTO
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  // Globální ClassSerializerInterceptor pro transformaci odpovědí
  // Musí být za app.get(Reflector) - app.get(Reflector) se použije jako argument konstruktoru
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Supplement Management API')
    .setDescription('API documentation for the Supplement Management System')
    .setVersion('1.0')
    .addBearerAuth() // For JWT Bearer token
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Swagger UI endpoint

  // Generování Swagger JSON souboru
  // Předpokládáme, že skript běží s CWD nastaveným na packages/backend
  const outputPath = path.resolve('swagger-spec.json'); 
  try {
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    console.log(`Swagger JSON specification generated at: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to write Swagger JSON specification: ${error}`);
  }

  // Enable CORS
  app.enableCors();

  await app.listen(process.env.BACKEND_PORT || 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation (UI) is available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
