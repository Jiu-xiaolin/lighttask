import { AdminService } from "./admin.service.js";
export declare class AdminController {
    private readonly admin;
    constructor(admin: AdminService);
    health(u: any): {
        system: {
            cpu: {
                model: string;
                cores: number;
                usage: number;
                load1m: number;
                load5m: number;
                status: string;
            };
            memory: {
                total: number;
                used: number;
                free: number;
                percent: number;
                totalGB: number;
                usedGB: number;
                status: string;
            };
            uptime: {
                seconds: number;
                formatted: string;
            };
            platform: NodeJS.Platform;
            nodeVersion: string;
            pid: number;
        };
        storage: {
            dataFile: {
                sizeBytes: number;
            };
            dataDir: string;
        };
        generatedAt: string;
    };
    adminUsers(u: any): Promise<{
        users: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            enabled: boolean;
            avatar: string;
            signature: string;
            theme: string;
        }[];
    }>;
    createUser(u: any, b: any): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            enabled: boolean;
        };
    }>;
    updateUser(u: any, id: string, b: any): Promise<{
        user: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            username: string;
            passwordHash: string;
            role: import("@prisma/client").$Enums.UserRole;
            avatar: string | null;
            signature: string | null;
            theme: string;
            cardBackground: string;
            themeConfig: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    resetUserPassword(u: any, id: string, b: any): Promise<{
        ok: boolean;
    }>;
    userSessions(u: any, id: string): Promise<{
        sessions: {
            id: string;
            userId: string;
            createdAt: Date;
            tokenHash: string;
            ip: string;
            userAgent: string | null;
            revoked: boolean;
            revokedReason: string | null;
            lastActivityAt: Date;
        }[];
    }>;
    revokeSession(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    changeUserRole(u: any, id: string, b: any): Promise<{
        user: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            username: string;
            passwordHash: string;
            role: import("@prisma/client").$Enums.UserRole;
            avatar: string | null;
            signature: string | null;
            theme: string;
            cardBackground: string;
            themeConfig: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    userProjects(u: any, id: string): Promise<{
        members: ({
            project: {
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
                start: Date;
                baselineEnd: Date;
                currentEnd: Date;
                settings: import("@prisma/client/runtime/library").JsonValue;
                acceptanceStatus: string;
                acceptanceStartedAt: Date | null;
                acceptanceApprovedAt: Date | null;
                archivedAt: Date | null;
            };
        } & {
            id: string;
            userId: string;
            role: string;
            projectId: string;
            joinedAt: Date;
        })[];
    }>;
    assignProject(u: any, id: string, b: any): Promise<{
        member: {
            id: string;
            userId: string;
            role: string;
            projectId: string;
            joinedAt: Date;
        };
    }>;
    removeProject(u: any, uid: string, pid: string): Promise<{
        ok: boolean;
    }>;
    listIpEntries(u: any, uid?: string): Promise<{
        entries: {
            id: string;
            userId: string;
            enabled: boolean;
            value: string;
            note: string | null;
            createdBy: string;
            createdAt: Date;
        }[];
    }>;
    addIpEntry(u: any, b: any): Promise<{
        entry: {
            id: string;
            userId: string;
            enabled: boolean;
            value: string;
            note: string | null;
            createdBy: string;
            createdAt: Date;
        };
    }>;
    removeIpEntry(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    toggleIpPolicy(u: any, b: any): Promise<{
        policy: {
            id: string;
            userId: string;
            enabled: boolean;
            updatedBy: string | null;
            updatedAt: Date;
        };
    }>;
    roles(u: any): Promise<{
        roles: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        }[];
        scopes: {
            id: string;
            enabled: boolean;
            name: string;
            key: string;
            target: string;
        }[];
        matrix: {
            roleId: string;
            roleName: string;
            role: string;
            builtin: boolean;
            scopes: {
                key: string;
                name: string;
                granted: boolean;
            }[];
        }[];
    }>;
    createRole(u: any, b: any): Promise<{
        role: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        };
    }>;
    copyRole(u: any, id: string): Promise<{
        role: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        };
    }>;
    deleteRole(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    updateRole(u: any, id: string, b: any): Promise<{
        role: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        };
    }>;
    createScope(u: any, b: any): Promise<{
        scope: {
            id: string;
            enabled: boolean;
            name: string;
            key: string;
            target: string;
        };
    }>;
    updateScope(u: any, id: string, b: any): Promise<{
        scope: {
            id: string;
            enabled: boolean;
            name: string;
            key: string;
            target: string;
        };
    }>;
    deleteScope(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    permissionMatrix(u: any): Promise<{
        roles: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        }[];
        scopes: {
            id: string;
            enabled: boolean;
            name: string;
            key: string;
            target: string;
        }[];
        matrix: {
            roleId: string;
            roleName: string;
            role: string;
            builtin: boolean;
            scopes: {
                key: string;
                name: string;
                granted: boolean;
            }[];
        }[];
    }>;
    auditLogs(u: any, q: any): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            type: string;
            actorId: string;
            message: string;
            metadata: import("@prisma/client/runtime/library").JsonValue;
        }[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    notif(u: any): Promise<{
        rules: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            createdAt: Date;
            event: string;
            channel: string;
            targetMode: string;
            targets: string[];
        }[];
        logs: {
            id: string;
            createdAt: Date;
            projectId: string | null;
            message: string;
            status: string;
            event: string;
            channel: string;
            targetMode: string;
            targets: string;
            ruleId: string | null;
            retryCount: number;
        }[];
        channels: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
        }[];
        keys: {
            id: string;
            name: string;
            channelId: string;
            type: string;
            enabled: boolean;
            secretMasked: string;
        }[];
    }>;
    createRule(u: any, b: any): Promise<{
        rule: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            createdAt: Date;
            event: string;
            channel: string;
            targetMode: string;
            targets: string[];
        };
    }>;
    updateRule(u: any, id: string, b: any): Promise<{
        rule: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            createdAt: Date;
            event: string;
            channel: string;
            targetMode: string;
            targets: string[];
        };
    }>;
    deleteRule(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    toggleRule(u: any, id: string): Promise<{
        rule: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            createdAt: Date;
            event: string;
            channel: string;
            targetMode: string;
            targets: string[];
        };
    }>;
    createChannel(u: any, b: any): Promise<{
        channel: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    updateChannel(u: any, id: string, b: any): Promise<{
        channel: {
            id: string;
            enabled: boolean;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    deleteChannel(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    createKey(u: any, b: any): Promise<{
        key: {
            id: string;
            name: string;
            channelId: string;
            type: string;
            enabled: boolean;
            secretMasked: string;
        };
    }>;
    updateKey(u: any, id: string, b: any): Promise<{
        key: {
            id: string;
            name: string;
            channelId: string;
            type: string;
            enabled: boolean;
            secretMasked: string;
        };
    }>;
    deleteKey(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    retryNotification(u: any, id: string): Promise<{
        log: {
            id: string;
            createdAt: Date;
            projectId: string | null;
            message: string;
            status: string;
            event: string;
            channel: string;
            targetMode: string;
            targets: string;
            ruleId: string | null;
            retryCount: number;
        };
    }>;
    testNotification(u: any, b: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    acceptance(u: any, pid: string): Promise<{
        items: {
            id: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.AcceptanceStatus;
            title: string;
            reviewedBy: string | null;
            reviewedAt: Date | null;
        }[];
        reports: {
            id: string;
            note: string | null;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            projectId: string;
            generatedBy: string;
        }[];
    }>;
    startAcceptance(u: any, pid: string): Promise<{
        project: {
            id: string;
            acceptanceStatus: string;
        };
    }>;
    approveAcceptance(u: any, pid: string): Promise<{
        project: {
            id: string;
            acceptanceStatus: string;
        };
    }>;
    acceptanceReport(u: any, pid: string, b: any): Promise<{
        report: {
            id: string;
            note: string | null;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            projectId: string;
            generatedBy: string;
        };
    }>;
    createAcceptanceItem(u: any, pid: string, b: any): Promise<{
        item: {
            id: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.AcceptanceStatus;
            title: string;
            reviewedBy: string | null;
            reviewedAt: Date | null;
        };
    }>;
    updateAcceptanceItem(u: any, id: string, b: any): Promise<{
        item: {
            id: string;
            note: string | null;
            projectId: string;
            status: import("@prisma/client").$Enums.AcceptanceStatus;
            title: string;
            reviewedBy: string | null;
            reviewedAt: Date | null;
        };
    }>;
    deleteAcceptanceItem(u: any, id: string): Promise<{
        ok: boolean;
    }>;
    settings(u: any, pid: string, b: any): {
        project: {
            id: string;
            settings: any;
        };
    };
    search(u: any, q?: string): Promise<{
        projects: {
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
            start: Date;
            baselineEnd: Date;
            currentEnd: Date;
            settings: import("@prisma/client/runtime/library").JsonValue;
            acceptanceStatus: string;
            acceptanceStartedAt: Date | null;
            acceptanceApprovedAt: Date | null;
            archivedAt: Date | null;
        }[];
        tasks: {
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
        }[];
        files: {
            id: string;
            updatedAt: Date;
            name: string;
            createdAt: Date;
            projectId: string;
            type: import("@prisma/client").$Enums.FileType;
            ownerId: string;
            deleted: boolean;
            content: string | null;
            storagePath: string | null;
            folder: string;
            version: number;
            frozenVersion: number | null;
        }[];
        users: {
            id: string;
            username: string;
            name: string;
            avatar: string;
        }[];
    }>;
    realtime(u: any): {
        status: {
            onlineUsers: number;
            activeProjects: number;
            lowResourceMode: boolean;
        };
    };
    collabEvent(u: any, b: any): {
        event: any;
    };
}
