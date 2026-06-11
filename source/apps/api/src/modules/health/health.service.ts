import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  liveness() {
    return {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.redis.ping(),
    };
    const ready = checks.database && checks.redis;
    return {
      status: ready ? "ready" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
