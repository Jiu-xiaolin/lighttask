var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [PrismaModule, EventModule, AuthModule, ProjectModule, TaskModule, DashboardModule, FileModule, ProfileModule, AdminModule],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map