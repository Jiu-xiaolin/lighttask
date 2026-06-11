import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { ProjectModule } from "./modules/project/project.module.js";
import { TaskModule } from "./modules/task/task.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { FileModule } from "./modules/file/file.module.js";
import { ProfileModule } from "./modules/profile/profile.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { EventModule } from "./common/events/event.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { AppConfigModule } from "./config/config.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { RateLimitGuard } from "./common/guards/rate-limit.guard.js";

@Module({
  imports: [AppConfigModule, PrismaModule, RedisModule, EventModule, HealthModule, AuthModule, ProjectModule, TaskModule, DashboardModule, FileModule, ProfileModule, AdminModule],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class AppModule {}
