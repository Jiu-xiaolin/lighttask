import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/index.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(private health: HealthService) {}

  @Public()
  @Get()
  liveness() {
    return this.health.liveness();
  }

  @Public()
  @Get("ready")
  readiness() {
    return this.health.readiness();
  }
}
