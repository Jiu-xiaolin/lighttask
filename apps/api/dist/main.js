import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./app.module.js";
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({ origin: true, credentials: true });
    app.setGlobalPrefix("api");
    const uploadsDir = join(process.cwd(), "uploads", "avatars");
    if (!existsSync(uploadsDir))
        mkdirSync(uploadsDir, { recursive: true });
    app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(Number(process.env.APP_PORT || 3000), "0.0.0.0");
}
bootstrap();
//# sourceMappingURL=main.js.map