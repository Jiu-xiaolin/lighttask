var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { TaskService } from "./task.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";
let TaskController = class TaskController {
    task;
    constructor(task) {
        this.task = task;
    }
    tasksOf(user, projectId) {
        return this.task.tasksOf(user, projectId);
    }
    createTask(user, projectId, body) {
        return this.task.createTask(user, projectId, body);
    }
    getTask(user, taskId) {
        return this.task.getTask(user, taskId);
    }
    updateTask(user, taskId, body) {
        return this.task.updateTask(user, taskId, body);
    }
    deleteTask(user, taskId) {
        return this.task.deleteTask(user, taskId);
    }
    copyTask(user, taskId) {
        return this.task.copyTask(user, taskId);
    }
    archiveTask(user, taskId) {
        return this.task.archiveTask(user, taskId);
    }
    restoreTask(user, taskId) {
        return this.task.restoreTask(user, taskId);
    }
    getTaskFull(user, taskId) {
        return this.task.getTaskFull(user, taskId);
    }
    // Progress actions
    updateProgress(user, progressId, body) {
        return this.task.updateProgress(user, progressId, body);
    }
    progressAction(user, progressId, action, body) {
        const patchByAction = {
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
    submit(user, progressId, body) {
        return this.task.submit(user, progressId, body);
    }
};
__decorate([
    Get("projects/:projectId/tasks"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "tasksOf", null);
__decorate([
    Post("projects/:projectId/tasks"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "createTask", null);
__decorate([
    Get("tasks/:taskId"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "getTask", null);
__decorate([
    Patch("tasks/:taskId"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "updateTask", null);
__decorate([
    Delete("tasks/:taskId"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "deleteTask", null);
__decorate([
    Post("tasks/:taskId/copy"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "copyTask", null);
__decorate([
    Post("tasks/:taskId/archive"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "archiveTask", null);
__decorate([
    Post("tasks/:taskId/restore"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "restoreTask", null);
__decorate([
    Get("tasks/:taskId/full"),
    __param(0, CurrentUser()),
    __param(1, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "getTaskFull", null);
__decorate([
    Patch("task-progress/:progressId"),
    __param(0, CurrentUser()),
    __param(1, Param("progressId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "updateProgress", null);
__decorate([
    Post("task-progress/:progressId/:action"),
    __param(0, CurrentUser()),
    __param(1, Param("progressId")),
    __param(2, Param("action")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "progressAction", null);
__decorate([
    Post("task-progress/:progressId/submissions"),
    __param(0, CurrentUser()),
    __param(1, Param("progressId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], TaskController.prototype, "submit", null);
TaskController = __decorate([
    Controller(),
    UseGuards(AuthGuard),
    __metadata("design:paramtypes", [TaskService])
], TaskController);
export { TaskController };
//# sourceMappingURL=task.controller.js.map