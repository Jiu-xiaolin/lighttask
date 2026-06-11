import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId } from "../utils/index.js";
import { RedisService } from "../../redis/redis.service.js";

type AppEventInput = {
  type: string;
  actor?: any;
  projectId?: string | null;
  message: string;
  color?: string;
  metadata?: Record<string, unknown>;
  audit?: boolean;
  timeline?: boolean;
};

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async record(input: AppEventInput) {
    const actorId = input.actor?.id || "system";
    const actorName = input.actor?.name || input.actor?.username || "系统";
    const metadata = input.metadata || {};
    const writes: Promise<unknown>[] = [];

    if (input.projectId && input.timeline !== false) {
      writes.push(this.prisma.timelineEvent.create({
        data: {
          id: genId("ev"),
          projectId: input.projectId,
          type: input.type,
          actorId,
          actorName,
          message: input.message,
          color: input.color || "blue",
        },
      }));
    }

    if (input.audit !== false) {
      writes.push(this.prisma.auditLog.create({
        data: {
          id: genId("aud"),
          type: input.type,
          actorId,
          message: input.message,
          metadata: metadata as Prisma.InputJsonValue,
        },
      }));
    }

    await Promise.all(writes).catch((error) => {
      this.logger.warn(`Failed to record event ${input.type}: ${error?.message || error}`);
    });
    await this.redis.invalidateBusinessCaches();
    await this.redis.publish("lighttask:events", {
      type: input.type,
      projectId: input.projectId || null,
      actorId,
      message: input.message,
      metadata,
      at: new Date().toISOString(),
    });
  }
}
