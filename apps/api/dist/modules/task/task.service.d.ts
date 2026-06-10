import { PrismaService } from "../../prisma/prisma.service.js";
import { EventService } from "../../common/events/event.service.js";
export declare class TaskService {
    private prisma;
    private events;
    constructor(prisma: PrismaService, events: EventService);
    checkAccess(user: any, projectId: string): Promise<{
        id: string;
        userId: string;
        role: string;
        projectId: string;
        joinedAt: Date;
    } | undefined>;
    canEdit(user: any, projectId: string): Promise<boolean | undefined>;
    tasksOf(user: any, projectId: string): Promise<{
        tasks: ({
            progressItems: {
                id: string;
                userId: string;
                note: string | null;
                projectId: string;
                status: import("@prisma/client").$Enums.ProgressStatus;
                progress: number;
                currentEnd: Date;
                planStart: Date;
                planEnd: Date;
                actualStart: Date | null;
                actualEnd: Date | null;
                deltaDays: number | null;
                nextAction: string | null;
                taskId: string;
            }[];
        } & {
            id: string;
            updatedAt: Date;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.TaskStatus;
            baselineEnd: Date;
            currentEnd: Date;
            title: string;
            priority: string;
            sortOrder: number;
            baselineStart: Date;
            currentStart: Date;
            dependencyIds: string[];
        })[];
    }>;
    createTask(user: any, projectId: string, body: any): Promise<{
        task: {
            id: string;
            updatedAt: Date;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.TaskStatus;
            baselineEnd: Date;
            currentEnd: Date;
            title: string;
            priority: string;
            sortOrder: number;
            baselineStart: Date;
            currentStart: Date;
            dependencyIds: string[];
        };
        progressItems: {
            id: string;
            userId: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.ProgressStatus;
            progress: number;
            currentEnd: Date;
            planStart: Date;
            planEnd: Date;
            actualStart: Date | null;
            actualEnd: Date | null;
            deltaDays: number | null;
            nextAction: string | null;
            taskId: string;
        }[];
        assignments: {
            id: string;
            userId: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.ProgressStatus;
            progress: number;
            currentEnd: Date;
            planStart: Date;
            planEnd: Date;
            actualStart: Date | null;
            actualEnd: Date | null;
            deltaDays: number | null;
            nextAction: string | null;
            taskId: string;
        }[];
    }>;
    getTask(user: any, taskId: string): Promise<{
        task: {
            id: string;
            updatedAt: Date;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.TaskStatus;
            baselineEnd: Date;
            currentEnd: Date;
            title: string;
            priority: string;
            sortOrder: number;
            baselineStart: Date;
            currentStart: Date;
            dependencyIds: string[];
        };
        progressItems: {
            id: string;
            userId: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.ProgressStatus;
            progress: number;
            currentEnd: Date;
            planStart: Date;
            planEnd: Date;
            actualStart: Date | null;
            actualEnd: Date | null;
            deltaDays: number | null;
            nextAction: string | null;
            taskId: string;
        }[];
    }>;
    updateTask(user: any, taskId: string, body: any): Promise<{
        task: {
            id: string;
            updatedAt: Date;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.TaskStatus;
            baselineEnd: Date;
            currentEnd: Date;
            title: string;
            priority: string;
            sortOrder: number;
            baselineStart: Date;
            currentStart: Date;
            dependencyIds: string[];
        };
    }>;
    deleteTask(user: any, taskId: string): Promise<{
        ok: boolean;
    }>;
    copyTask(user: any, taskId: string): Promise<{
        task: {
            id: string;
            updatedAt: Date;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.TaskStatus;
            baselineEnd: Date;
            currentEnd: Date;
            title: string;
            priority: string;
            sortOrder: number;
            baselineStart: Date;
            currentStart: Date;
            dependencyIds: string[];
        };
    }>;
    archiveTask(user: any, taskId: string): Promise<{
        ok: boolean;
    }>;
    restoreTask(user: any, taskId: string): Promise<{
        ok: boolean;
    }>;
    updateProgress(user: any, progressId: string, body: any, action?: string): Promise<{
        progress: {
            id: string;
            userId: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.ProgressStatus;
            progress: number;
            currentEnd: Date;
            planStart: Date;
            planEnd: Date;
            actualStart: Date | null;
            actualEnd: Date | null;
            deltaDays: number | null;
            nextAction: string | null;
            taskId: string;
        };
        assignment: {
            id: string;
            userId: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.ProgressStatus;
            progress: number;
            currentEnd: Date;
            planStart: Date;
            planEnd: Date;
            actualStart: Date | null;
            actualEnd: Date | null;
            deltaDays: number | null;
            nextAction: string | null;
            taskId: string;
        };
    }>;
    submit(user: any, progressId: string, body: any): Promise<{
        submission: {
            id: string;
            userId: string;
            updatedAt: Date;
            name: string;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.SubmissionStatus;
            deleted: boolean;
            taskId: string;
            progressId: string;
            fileType: string;
            content: string | null;
            storagePath: string | null;
            reviewNote: string | null;
            reviewedBy: string | null;
        };
    }>;
    getTaskFull(user: any, taskId: string): Promise<{
        task: {
            id: string;
            updatedAt: Date;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.TaskStatus;
            baselineEnd: Date;
            currentEnd: Date;
            title: string;
            priority: string;
            sortOrder: number;
            baselineStart: Date;
            currentStart: Date;
            dependencyIds: string[];
        };
        progressItems: {
            id: string;
            userId: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.ProgressStatus;
            progress: number;
            currentEnd: Date;
            planStart: Date;
            planEnd: Date;
            actualStart: Date | null;
            actualEnd: Date | null;
            deltaDays: number | null;
            nextAction: string | null;
            taskId: string;
        }[];
        submissions: {
            id: string;
            userId: string;
            updatedAt: Date;
            name: string;
            note: string | null;
            createdAt: Date;
            projectId: string;
            status: import("@prisma/client").$Enums.SubmissionStatus;
            deleted: boolean;
            taskId: string;
            progressId: string;
            fileType: string;
            content: string | null;
            storagePath: string | null;
            reviewNote: string | null;
            reviewedBy: string | null;
        }[];
    }>;
}
