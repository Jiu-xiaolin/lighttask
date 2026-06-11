import { Body, Controller, Get, Patch, Sse, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";

@Controller()
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("dashboard")
  getDashboard(@CurrentUser() user: any) {
    return this.dashboard.dashboard(user);
  }

  @Get("dashboard-full")
  dashboardFull(@CurrentUser() user: any) {
    return this.dashboard.dashboardFull(user);
  }

  @Get("dashboard/stats")
  dashboardStats(@CurrentUser() user: any) {
    return this.dashboard.dashboardStats(user);
  }

  @Get("dashboard/gantt-v2")
  ganttV2(@CurrentUser() user: any) {
    return this.dashboard.ganttV2(user);
  }

  @Sse("dashboard/events")
  events(@CurrentUser() user: any) {
    return this.dashboard.events(user);
  }

  @Patch("dashboard/gantt-sync")
  syncGantt(@CurrentUser() user: any, @Body() body: any) {
    return this.dashboard.syncGantt(user, body);
  }

  @Get("dashboard/member-gantt")
  memberGantt(@CurrentUser() user: any) {
    return this.dashboard.memberGantt(user);
  }
}
