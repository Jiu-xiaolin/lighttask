import { PrismaService } from "../../prisma/prisma.service.js";
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
export declare class EventService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    record(input: AppEventInput): Promise<void>;
}
export {};
