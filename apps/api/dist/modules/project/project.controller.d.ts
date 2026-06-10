import { ProjectService } from "./project.service.js";
export declare class ProjectController {
    private readonly project;
    constructor(project: ProjectService);
    listProjects(user: any, filter?: string, group?: string): Promise<{
        projects: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: import("@prisma/client").$Enums.ProjectStatus;
            progress: number;
            risk: string;
            currentEnd: string;
            description: string | null;
            acceptanceStatus: string;
            memberCount: number;
            taskCount: number;
            completedTaskCount: number;
        }[];
    }>;
    createProject(user: any, body: any): Promise<{
        project: {
            currentEnd: string;
            baselineEnd: string;
            start: string;
            id: string;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            group: string;
            description: string | null;
            ownerId: string;
            status: import("@prisma/client").$Enums.ProjectStatus;
            progress: number;
            risk: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            acceptanceStatus: string;
            acceptanceStartedAt: Date | null;
            acceptanceApprovedAt: Date | null;
            archivedAt: Date | null;
        };
    }>;
    projectDetail(user: any, projectId: string): Promise<{
        project: {
            progress: number;
            currentEnd: string;
            baselineEnd: string;
            start: string;
            id: string;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            group: string;
            description: string | null;
            ownerId: string;
            status: import("@prisma/client").$Enums.ProjectStatus;
            risk: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            acceptanceStatus: string;
            acceptanceStartedAt: Date | null;
            acceptanceApprovedAt: Date | null;
            archivedAt: Date | null;
        };
        members: ({
            user: {
                id: string;
                name: string;
                username: string;
                role: import("@prisma/client").$Enums.UserRole;
                avatar: string | null;
            };
        } & {
            id: string;
            userId: string;
            role: string;
            projectId: string;
            joinedAt: Date;
        })[];
        stats: {
            tasks: number;
            completedTasks: number;
            progressPercent: number;
            files: number;
            acceptance: number;
        };
        timeline: {
            createdAt: string;
            id: string;
            projectId: string;
            type: string;
            actorId: string;
            actorName: string;
            message: string;
            color: string;
        }[];
    }>;
    updateProject(user: any, projectId: string, body: any): Promise<{
        project: {
            currentEnd: string;
            baselineEnd: string;
            start: string;
            id: string;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            group: string;
            description: string | null;
            ownerId: string;
            status: import("@prisma/client").$Enums.ProjectStatus;
            progress: number;
            risk: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            acceptanceStatus: string;
            acceptanceStartedAt: Date | null;
            acceptanceApprovedAt: Date | null;
            archivedAt: Date | null;
        };
    }>;
    archiveProject(user: any, projectId: string): Promise<{
        project: {
            id: string;
            status: string;
        };
    }>;
    restoreProject(user: any, projectId: string): Promise<{
        project: {
            id: string;
            status: string;
        };
    }>;
    deleteProject(user: any, projectId: string): Promise<{
        ok: boolean;
    }>;
    members(user: any, projectId: string): Promise<{
        members: ({
            user: {
                id: string;
                name: string;
                username: string;
                role: import("@prisma/client").$Enums.UserRole;
                avatar: string | null;
                signature: string | null;
            };
        } & {
            id: string;
            userId: string;
            role: string;
            projectId: string;
            joinedAt: Date;
        })[];
    }>;
    invite(user: any, projectId: string, body: any): Promise<{
        member: {
            role: any;
            id: string;
            userId: string;
            projectId: string;
            joinedAt: Date;
        };
    }>;
    updateMember(user: any, projectId: string, memberId: string, body: any): Promise<{
        member: {
            id: string;
            userId: string;
            role: string;
            projectId: string;
            joinedAt: Date;
        };
    }>;
    removeMember(user: any, projectId: string, memberId: string): Promise<{
        ok: boolean;
    }>;
    projectGroups(user: any): Promise<{
        groups: {
            name: string;
            count: number;
        }[];
    }>;
}
