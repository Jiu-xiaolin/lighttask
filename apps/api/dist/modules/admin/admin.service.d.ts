import { PrismaService } from "../../prisma/prisma.service.js";
import { EventService } from "../../common/events/event.service.js";
export declare class AdminService {
    private prisma;
    private events;
    constructor(prisma: PrismaService, events: EventService);
    requireAdmin(user: any): void;
    private visibleProjectIds;
    health(user: any): {
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
    adminUsers(user: any): Promise<{
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
    createUser(user: any, body: any): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            enabled: boolean;
        };
    }>;
    updateUser(user: any, userId: string, body: any): Promise<{
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
    resetUserPassword(user: any, userId: string, body: any): Promise<{
        ok: boolean;
    }>;
    userSessions(user: any, userId: string): Promise<{
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
    revokeSession(user: any, sessionId: string): Promise<{
        ok: boolean;
    }>;
    changeUserRole(user: any, userId: string, body: any): Promise<{
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
    userProjects(user: any, userId: string): Promise<{
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
    assignProject(user: any, userId: string, body: any): Promise<{
        member: {
            id: string;
            userId: string;
            role: string;
            projectId: string;
            joinedAt: Date;
        };
    }>;
    removeProject(user: any, userId: string, projectId: string): Promise<{
        ok: boolean;
    }>;
    listIpEntries(user: any, userId?: string): Promise<{
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
    addIpEntry(user: any, body: any): Promise<{
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
    removeIpEntry(user: any, entryId: string): Promise<{
        ok: boolean;
    }>;
    toggleIpPolicy(user: any, body: any): Promise<{
        policy: {
            id: string;
            userId: string;
            enabled: boolean;
            updatedBy: string | null;
            updatedAt: Date;
        };
    }>;
    roles(user: any): Promise<{
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
    createRole(user: any, body: any): Promise<{
        role: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        };
    }>;
    copyRoleTemplate(user: any, roleId: string): Promise<{
        role: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        };
    }>;
    deleteRoleTemplate(user: any, roleId: string): Promise<{
        ok: boolean;
    }>;
    updateRolePermissions(user: any, roleId: string, body: any): Promise<{
        role: {
            id: string;
            name: string;
            role: string;
            builtin: boolean;
            permissions: string[];
        };
    }>;
    createScope(user: any, body: any): Promise<{
        scope: {
            id: string;
            enabled: boolean;
            name: string;
            key: string;
            target: string;
        };
    }>;
    updateScope(user: any, scopeId: string, body: any): Promise<{
        scope: {
            id: string;
            enabled: boolean;
            name: string;
            key: string;
            target: string;
        };
    }>;
    deleteScope(user: any, scopeId: string): Promise<{
        ok: boolean;
    }>;
    permissionMatrix(user: any): Promise<{
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
    auditLogs(user: any, query?: any): Promise<{
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
    notif(user: any): Promise<{
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
    createRule(user: any, body: any): Promise<{
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
    updateRule(user: any, ruleId: string, body: any): Promise<{
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
    deleteRule(user: any, ruleId: string): Promise<{
        ok: boolean;
    }>;
    toggleRule(user: any, ruleId: string): Promise<{
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
    createChannel(user: any, body: any): Promise<{
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
    updateChannel(user: any, channelId: string, body: any): Promise<{
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
    deleteChannel(user: any, channelId: string): Promise<{
        ok: boolean;
    }>;
    createKey(user: any, body: any): Promise<{
        key: {
            id: string;
            name: string;
            channelId: string;
            type: string;
            enabled: boolean;
            secretMasked: string;
        };
    }>;
    updateKey(user: any, keyId: string, body: any): Promise<{
        key: {
            id: string;
            name: string;
            channelId: string;
            type: string;
            enabled: boolean;
            secretMasked: string;
        };
    }>;
    deleteKey(user: any, keyId: string): Promise<{
        ok: boolean;
    }>;
    retry(user: any, logId: string): Promise<{
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
    testNotification(user: any, body: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    acceptance(user: any, projectId: string): Promise<{
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
    startAcceptance(user: any, projectId: string): Promise<{
        project: {
            id: string;
            acceptanceStatus: string;
        };
    }>;
    approveAcceptance(user: any, projectId: string): Promise<{
        project: {
            id: string;
            acceptanceStatus: string;
        };
    }>;
    createAcceptanceReport(user: any, projectId: string, body: any): Promise<{
        report: {
            id: string;
            note: string | null;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            projectId: string;
            generatedBy: string;
        };
    }>;
    createAcceptanceItem(user: any, projectId: string, body: any): Promise<{
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
    updateAcceptanceItem(user: any, itemId: string, body: any): Promise<{
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
    deleteAcceptanceItem(user: any, itemId: string): Promise<{
        ok: boolean;
    }>;
    search(user: any, q: string): Promise<{
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
}
