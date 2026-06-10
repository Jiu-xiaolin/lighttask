import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { ProjectModule } from "./modules/project/project.module.js";
import { TaskModule } from "./modules/task/task.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { FileModule } from "./modules/file/file.module.js";
import { ProfileModule } from "./modules/profile/profile.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { EventModule } from "./common/events/event.module.js";

@Module({
  imports: [PrismaModule, EventModule, AuthModule, ProjectModule, TaskModule, DashboardModule, FileModule, ProfileModule, AdminModule],
})
export class AppModule {}
