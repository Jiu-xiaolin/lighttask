import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { TaskService } from "./task.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";

@Controller()
@UseGuards(AuthGuard)
export class TaskController {
  constructor(private readonly task: TaskService) {}

  @Get("projects/:projectId/tasks")
  tasksOf(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.task.tasksOf(user, projectId);
  }

  @Post("projects/:projectId/tasks")
  createTask(@CurrentUser() user: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.task.createTask(user, projectId, body);
  }

  @Get("tasks/:taskId")
  getTask(@CurrentUser() user: any, @Param("taskId") taskId: string) {
    return this.task.getTask(user, taskId);
  }

  @Patch("tasks/:taskId")
  updateTask(@CurrentUser() user: any, @Param("taskId") taskId: string, @Body() body: any) {
    return this.task.updateTask(user, taskId, body);
  }

  @Delete("tasks/:taskId")
  deleteTask(@CurrentUser() user: any, @Param("taskId") taskId: string) {
    return this.task.deleteTask(user, taskId);
  }

  @Post("tasks/:taskId/copy")
  copyTask(@CurrentUser() user: any, @Param("taskId") taskId: string) {
    return this.task.copyTask(user, taskId);
  }

  @Post("tasks/:taskId/archive")
  archiveTask(@CurrentUser() user: any, @Param("taskId") taskId: string) {
    return this.task.archiveTask(user, taskId);
  }

  @Post("tasks/:taskId/restore")
  restoreTask(@CurrentUser() user: any, @Param("taskId") taskId: string) {
    return this.task.restoreTask(user, taskId);
  }

  @Get("tasks/:taskId/full")
  getTaskFull(@CurrentUser() user: any, @Param("taskId") taskId: string) {
    return this.task.getTaskFull(user, taskId);
  }

  // Progress actions
  @Patch("task-progress/:progressId")
  updateProgress(@CurrentUser() user: any, @Param("progressId") progressId: string, @Body() body: any) {
    return this.task.updateProgress(user, progressId, body);
  }

  @Post("task-progress/:progressId/:action")
  progressAction(@CurrentUser() user: any, @Param("progressId") progressId: string, @Param("action") action: string, @Body() body: any) {
    const patchByAction: Record<string, any> = {
      complete: { progress: 100, status: "COMPLETED" },
      delay: { status: "DELAYED", note: body?.note || "延期" },
      block: { status: "BLOCKED", note: body?.note || "阻塞" },
      abandon: { status: "ABANDONED", note: body?.note || "放弃" },
      rest: { status: "TODO", nextAction: "rest" },
      continue: { status: "DOING", nextAction: "continue" },
      remind: { nextAction: "remind_creator" },
    };
    return this.task.updateProgress(user, progressId, { ...patchByAction[action], ...body }, action);
  }

  @Post("task-progress/:progressId/submissions")
  submit(@CurrentUser() user: any, @Param("progressId") progressId: string, @Body() body: any) {
    return this.task.submit(user, progressId, body);
  }
}
