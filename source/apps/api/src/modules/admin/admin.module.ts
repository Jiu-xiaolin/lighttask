import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { AdminController } from "./admin.controller.js";
import { FeishuBotService } from "./feishu-bot.service.js";

@Module({ controllers: [AdminController], providers: [AdminService, FeishuBotService], exports: [AdminService] })
export class AdminModule {}
