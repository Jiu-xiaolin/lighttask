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
import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";
let DashboardController = class DashboardController {
    dashboard;
    constructor(dashboard) {
        this.dashboard = dashboard;
    }
    getDashboard(user) {
        return this.dashboard.dashboard(user);
    }
    dashboardFull(user) {
        return this.dashboard.dashboardFull(user);
    }
    dashboardStats(user) {
        return this.dashboard.dashboardStats(user);
    }
    ganttV2(user) {
        return this.dashboard.ganttV2(user);
    }
    syncGantt(user, body) {
        return this.dashboard.syncGantt(user, body);
    }
    memberGantt(user) {
        return this.dashboard.memberGantt(user);
    }
};
__decorate([
    Get("dashboard"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getDashboard", null);
__decorate([
    Get("dashboard-full"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "dashboardFull", null);
__decorate([
    Get("dashboard/stats"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "dashboardStats", null);
__decorate([
    Get("dashboard/gantt-v2"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "ganttV2", null);
__decorate([
    Patch("dashboard/gantt-sync"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "syncGantt", null);
__decorate([
    Get("dashboard/member-gantt"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "memberGantt", null);
DashboardController = __decorate([
    Controller(),
    UseGuards(AuthGuard),
    __metadata("design:paramtypes", [DashboardService])
], DashboardController);
export { DashboardController };
//# sourceMappingURL=dashboard.controller.js.map