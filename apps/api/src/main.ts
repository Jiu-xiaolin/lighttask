import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/index.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isDev = process.env.NODE_ENV !== "production";
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",").map((s) => s.trim()).filter(Boolean);

  app.enableCors({
    credentials: true,
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In dev mode, allow any localhost / 127.0.0.1 port
      if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"), false);
    },
  });
  app.setGlobalPrefix("api");

  const uploadsDir = join(process.cwd(), "uploads", "avatars");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), "uploads", "avatars"), {
    prefix: "/uploads/avatars",
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(Number(process.env.APP_PORT || 3000), "0.0.0.0");
}

bootstrap();
