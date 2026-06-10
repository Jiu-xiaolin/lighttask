var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventService_1;
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId } from "../utils/index.js";
let EventService = EventService_1 = class EventService {
    prisma;
    logger = new Logger(EventService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(input) {
        const actorId = input.actor?.id || "system";
        const actorName = input.actor?.name || input.actor?.username || "系统";
        const metadata = input.metadata || {};
        const writes = [];
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
                    metadata: metadata,
                },
            }));
        }
        await Promise.all(writes).catch((error) => {
            this.logger.warn(`Failed to record event ${input.type}: ${error?.message || error}`);
        });
    }
};
EventService = EventService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], EventService);
export { EventService };
//# sourceMappingURL=event.service.js.map