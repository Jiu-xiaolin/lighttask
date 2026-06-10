import { Module } from "@nestjs/common";
import { TaskService } from "./task.service.js";
import { TaskController } from "./task.controller.js";

@Module({
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
