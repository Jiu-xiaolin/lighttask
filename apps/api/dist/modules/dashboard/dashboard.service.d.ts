import { PrismaService } from "../../prisma/prisma.service.js";
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    private visibleProjectIds;
    private canEditProject;
    private toDate;
    private linkIds;
    private daysBetween;
    dashboardStats(user: any): Promise<{
        metrics: {
            todayActions: number;
            myDeltaDays: number;
            myCompletion: number;
            pendingFiles: number;
            riskProjects: number;
            activeProjects: number;
        };
        statusCounts: {
            total: number;
            todo: number;
            doing: number;
            done: number;
            blocked: number;
        };
        pendingActions: any[];
        riskItems: {
            id: string;
            name: string;
            risk: string;
            ownerId: string | undefined;
            status: import("@prisma/client").$Enums.ProjectStatus | undefined;
            progress: number;
        }[];
        myProgress: ({
            submissions: {
                id: string;
            }[];
        } & {
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
        })[];
    }>;
    dashboard(user: any): Promise<{
        metrics: {
            todayActions: number;
            myDeltaDays: number;
            myCompletion: number;
            pendingFiles: number;
            riskProjects: number;
            activeProjects: number;
        };
        statusCounts: {
            total: number;
            todo: number;
            doing: number;
            done: number;
            blocked: number;
        };
        pendingActions: any[];
        riskItems: {
            id: string;
            name: string;
            risk: string;
            ownerId: string | undefined;
            status: import("@prisma/client").$Enums.ProjectStatus | undefined;
            progress: number;
        }[];
        myProgress: ({
            submissions: {
                id: string;
            }[];
        } & {
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
        })[];
    }>;
    dashboardFull(user: any): Promise<{
        projects: {
            id: string;
            name: string;
            group: string;
            status: import("@prisma/client").$Enums.ProjectStatus;
            risk: string;
            progress: number;
            totalTasks: number;
        }[];
        metrics: {
            todayActions: number;
            myDeltaDays: number;
            myCompletion: number;
            pendingFiles: number;
            riskProjects: number;
            activeProjects: number;
        };
        statusCounts: {
            total: number;
            todo: number;
            doing: number;
            done: number;
            blocked: number;
        };
        pendingActions: any[];
        riskItems: {
            id: string;
            name: string;
            risk: string;
            ownerId: string | undefined;
            status: import("@prisma/client").$Enums.ProjectStatus | undefined;
            progress: number;
        }[];
        myProgress: ({
            submissions: {
                id: string;
            }[];
        } & {
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
        })[];
    }>;
    ganttV2(user: any): Promise<{
        data: {
            id: string;
            name: string;
            startTime: string;
            endTime: string;
            progress: number;
            type: string;
            expanded: boolean;
            children: {
                id: string;
                name: string;
                startTime: string;
                endTime: string;
                progress: number;
                type: string;
                status: import("@prisma/client").$Enums.TaskStatus;
                priority: string;
                assignee: string;
                note: string;
            }[];
        }[];
        baselines: any[];
        links: any[];
    }>;
    syncGantt(user: any, body: any): Promise<{
        ok: boolean;
        updatedTaskIds: string[];
        updatedLinks: any;
    }>;
    memberGantt(user: any): Promise<{
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
}
