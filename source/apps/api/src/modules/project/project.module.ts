import { Module } from "@nestjs/common";
import { ProjectService } from "./project.service.js";
import { ProjectController } from "./project.controller.js";
import { FeishuBotService } from "../admin/feishu-bot.service.js";

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, FeishuBotService],
  exports: [ProjectService],
})
export class ProjectModule {}
