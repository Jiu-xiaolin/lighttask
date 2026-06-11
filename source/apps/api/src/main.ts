import { NestFactory } from "@nestjs/core";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/index.js";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { securityHeadersMiddleware } from "./common/middleware/security-headers.middleware.js";
import { AppConfigService } from "./config/app-config.service.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfigService);

  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.useBodyParser("json", { limit: config.bodyLimit });
  app.useBodyParser("urlencoded", { limit: config.bodyLimit, extended: true });
  app.enableCors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
  });
  app.setGlobalPrefix("api");

  const uploadsDir = join(process.cwd(), "uploads", "avatars");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), "uploads", "avatars"), {
    prefix: "/uploads/avatars",
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory(errors) {
      return new BadRequestException({
        message: "请求参数不合法",
        details: errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        })),
      });
    },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.port, "0.0.0.0");
}

bootstrap();
