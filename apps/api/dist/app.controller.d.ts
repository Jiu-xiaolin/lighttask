import { AppService } from "./app.service.js";
export declare class AppController {
    private readonly app;
    constructor(app: AppService);
    private ip;
    private current;
    login(body: any, req: any): {
        token: string;
        user: {
            customWallpaper: string;
            customBlur: number;
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
        };
    };
    dashboard(auth: string, req: any): {
        metrics: {
            activeProjects: number;
            todayActions: number;
            riskProjects: number;
            pendingFiles: number;
        };
        gantt: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        }[];
        myProgress: {
            id: string;
            taskId: string;
            projectId: string;
            userId: string;
            status: string;
            planStart: string;
            planEnd: string;
            currentEnd: string;
            actualStart?: string | null;
            actualEnd?: string | null;
            deltaDays?: number | null;
            progress: number;
            note?: string;
            nextAction?: string;
        }[];
    };
    memberGantt(auth: string, req: any): {
        assignments: {
            id: string;
            taskId: string;
            projectId: string;
            userId: string;
            status: string;
            planStart: string;
            planEnd: string;
            currentEnd: string;
            actualStart?: string | null;
            actualEnd?: string | null;
            deltaDays?: number | null;
            progress: number;
            note?: string;
            nextAction?: string;
        }[];
    };
    ganttViews(auth: string, req: any): {
        views: Record<string, any>[];
    };
    saveGanttView(auth: string, req: any, body: any): {
        view: {
            id: any;
            userId: string;
            name: any;
            filters: any;
            columns: any;
            zoom: any;
        };
    };
    projects(auth: string, req: any, filter?: string): {
        projects: {
            memberCount: number;
            taskCount: number;
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        }[];
    };
    createProject(auth: string, req: any, body: any): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
    };
    project(auth: string, req: any, projectId: string): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
        members: {
            user: {
                id: string;
                username: string;
                name: string;
                role: "SUPER_ADMIN" | "MEMBER";
                enabled: boolean;
                avatar: string;
                signature?: string;
                theme: string;
                customWallpaper?: string;
                customBlur?: number;
            };
            id: string;
            projectId: string;
            userId: string;
            role: string;
        }[];
        timeline: Record<string, any>[];
        stats: {
            tasks: number;
            progress: number;
            files: number;
            acceptance: number;
        };
    };
    updateProject(auth: string, req: any, projectId: string, body: any): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
    };
    archiveProject(auth: string, req: any, projectId: string): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
    };
    restoreProject(auth: string, req: any, projectId: string): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
    };
    settings(auth: string, req: any, projectId: string, body: any): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
    };
    members(auth: string, req: any, projectId: string): {
        members: {
            user: {
                id: string;
                username: string;
                name: string;
                role: "SUPER_ADMIN" | "MEMBER";
                enabled: boolean;
                avatar: string;
                signature?: string;
                theme: string;
                customWallpaper?: string;
                customBlur?: number;
            };
            id: string;
            projectId: string;
            userId: string;
            role: string;
        }[];
    };
    invite(auth: string, req: any, projectId: string, body: any): {
        member: {
            id: string;
            projectId: string;
            userId: string;
            role: string;
        };
    };
    tasks(auth: string, req: any, projectId: string): {
        tasks: {
            progressItems: {
                id: string;
                taskId: string;
                projectId: string;
                userId: string;
                status: string;
                planStart: string;
                planEnd: string;
                currentEnd: string;
                actualStart?: string | null;
                actualEnd?: string | null;
                deltaDays?: number | null;
                progress: number;
                note?: string;
                nextAction?: string;
            }[];
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        }[];
    };
    createTask(auth: string, req: any, projectId: string, body: any): {
        task: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
        progressItems: any;
        assignments: any;
    };
    updateProgress(auth: string, req: any, progressId: string, body: any): {
        progress: {
            id: string;
            taskId: string;
            projectId: string;
            userId: string;
            status: string;
            planStart: string;
            planEnd: string;
            currentEnd: string;
            actualStart?: string | null;
            actualEnd?: string | null;
            deltaDays?: number | null;
            progress: number;
            note?: string;
            nextAction?: string;
        };
        assignment: {
            id: string;
            taskId: string;
            projectId: string;
            userId: string;
            status: string;
            planStart: string;
            planEnd: string;
            currentEnd: string;
            actualStart?: string | null;
            actualEnd?: string | null;
            deltaDays?: number | null;
            progress: number;
            note?: string;
            nextAction?: string;
        };
    };
    progressAction(auth: string, req: any, progressId: string, action: string, body: any): {
        progress: {
            id: string;
            taskId: string;
            projectId: string;
            userId: string;
            status: string;
            planStart: string;
            planEnd: string;
            currentEnd: string;
            actualStart?: string | null;
            actualEnd?: string | null;
            deltaDays?: number | null;
            progress: number;
            note?: string;
            nextAction?: string;
        };
        assignment: {
            id: string;
            taskId: string;
            projectId: string;
            userId: string;
            status: string;
            planStart: string;
            planEnd: string;
            currentEnd: string;
            actualStart?: string | null;
            actualEnd?: string | null;
            deltaDays?: number | null;
            progress: number;
            note?: string;
            nextAction?: string;
        };
    };
    submit(auth: string, req: any, progressId: string, body: any): {
        submission: {
            id: string;
            projectId: string;
            taskId: string;
            progressId: string;
            userId: string;
            name: any;
            fileType: any;
            content: any;
            status: string;
            note: any;
            deleted: boolean;
            createdAt: string;
        };
    };
    files(auth: string, req: any, projectId: string): {
        files: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        }[];
    };
    createFile(auth: string, req: any, projectId: string, body: any): {
        file: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        };
    };
    file(auth: string, req: any, fileId: string): {
        file: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        };
        versions: Record<string, unknown>[];
    };
    updateFile(auth: string, req: any, fileId: string, body: any): {
        file: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        };
    };
    importFile(auth: string, req: any, fileId: string, body: any): {
        job: {
            id: string;
            type: "import" | "export";
            projectId: string;
            fileId: string;
            status: string;
            requestedBy: string;
            payload: {
                format: any;
                content: string;
            };
            createdAt: string;
            finishedAt: string;
        };
        export: {
            fileId: string;
            name: string;
            format: any;
            content: string;
        } | undefined;
        file: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        };
    };
    exportFile(auth: string, req: any, fileId: string, body: any): {
        job: {
            id: string;
            type: "import" | "export";
            projectId: string;
            fileId: string;
            status: string;
            requestedBy: string;
            payload: {
                format: any;
                content: string;
            };
            createdAt: string;
            finishedAt: string;
        };
        export: {
            fileId: string;
            name: string;
            format: any;
            content: string;
        } | undefined;
        file: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        };
    };
    acceptance(auth: string, req: any, projectId: string): {
        items: Record<string, any>[];
        reports: Record<string, any>[];
    };
    startAcceptance(auth: string, req: any, projectId: string): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
    };
    approveAcceptance(auth: string, req: any, projectId: string): {
        project: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        };
        frozenFiles: {
            id: string;
            version: number;
        }[];
    };
    acceptanceReport(auth: string, req: any, projectId: string, body: any): {
        report: {
            id: string;
            projectId: string;
            generatedBy: string;
            note: any;
            memberStats: {
                userId: string;
                totalAssignments: number;
            }[];
            createdAt: string;
        };
    };
    health(auth: string, req: any): {
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
        services: {
            postgresql: {
                status: string;
                latency: number;
                note: string;
            };
            redis: {
                status: string;
                latency: number;
                note: string;
            };
            websocket: {
                connections: number;
                status: string;
            };
            worker: {
                queued: number;
                completed: number;
                status: string;
            };
        };
        storage: {
            dataFile: {
                sizeBytes: number;
            };
            dataDir: string;
        };
        business: {
            users: {
                total: number;
                enabled: number;
            };
            projects: number;
            tasks: number;
            files: number;
            sessions: number;
        };
        lowResourceMode: boolean;
        generatedAt: string;
    };
    adminUsers(auth: string, req: any): {
        users: {
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
            customWallpaper?: string;
            customBlur?: number;
        }[];
    };
    createUser(auth: string, req: any, body: any): {
        user: {
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
            customWallpaper?: string;
            customBlur?: number;
        };
    };
    notifications(auth: string, req: any): {
        rules: Record<string, any>[];
        logs: Record<string, any>[];
        channels: Record<string, any>[];
        keys: {
            id: any;
            name: any;
            channelId: any;
            type: any;
            enabled: any;
            secretMasked: any;
        }[];
    };
    createRule(auth: string, req: any, body: any): {
        rule: {
            id: string;
            event: any;
            channel: any;
            targetMode: any;
            targets: any;
            enabled: boolean;
        };
    };
    createChannel(auth: string, req: any, body: any): {
        channel: {
            id: string;
            name: any;
            type: any;
            enabled: boolean;
            config: any;
        };
    };
    createKey(auth: string, req: any, body: any): {
        key: {
            id: string;
            name: any;
            channelId: any;
            type: any;
            enabled: boolean;
            secretMasked: string;
        };
    };
    retryNotification(auth: string, req: any, logId: string): {
        log: Record<string, any>;
    };
    roles(auth: string, req: any): {
        roles: Record<string, any>[];
        scopes: Record<string, any>[];
        matrix: {
            roleId: any;
            roleName: any;
            role: any;
            builtin: any;
            scopes: {
                key: any;
                name: any;
                granted: boolean;
            }[];
        }[];
    };
    createRole(auth: string, req: any, body: any): {
        role: {
            id: string;
            name: any;
            role: any;
            builtin: boolean;
            permissions: any;
        };
    };
    createScope(auth: string, req: any, body: any): {
        scope: {
            id: string;
            key: any;
            name: any;
            description: any;
            target: any;
            enabled: boolean;
        };
    };
    updateScope(auth: string, req: any, scopeId: string, body: any): {
        scope: Record<string, any>;
    };
    deleteScope(auth: string, req: any, scopeId: string): {
        ok: boolean;
    };
    copyRole(auth: string, req: any, roleId: string): {
        role: {
            id: string;
            name: string;
            builtin: boolean;
        };
    };
    deleteRole(auth: string, req: any, roleId: string): {
        ok: boolean;
    };
    updateRole(auth: string, req: any, roleId: string, body: any): {
        role: Record<string, any>;
    };
    permissionMatrix(auth: string, req: any): {
        matrix: {
            roleId: any;
            roleName: any;
            role: any;
            builtin: any;
            scopes: {
                key: any;
                name: any;
                granted: boolean;
            }[];
        }[];
    };
    auditLogs(auth: string, req: any): {
        logs: Record<string, any>[];
    };
    realtime(auth: string, req: any): {
        status: {
            onlineUsers: number;
            activeProjects: number;
            lowResourceMode: boolean;
        };
    };
    collabEvent(auth: string, req: any, body: any): {
        event: {
            id: string;
            projectId: any;
            fileId: any;
            type: any;
            actorId: string;
            actorName: string;
            payload: any;
            createdAt: string;
        };
    };
    getTask(auth: string, req: any, taskId: string): {
        task: {
            progressItems: {
                id: string;
                taskId: string;
                projectId: string;
                userId: string;
                status: string;
                planStart: string;
                planEnd: string;
                currentEnd: string;
                actualStart?: string | null;
                actualEnd?: string | null;
                deltaDays?: number | null;
                progress: number;
                note?: string;
                nextAction?: string;
            }[];
            submissions: Record<string, any>[];
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
    };
    updateTask(auth: string, req: any, taskId: string, body: any): {
        task: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
    };
    deleteTask(auth: string, req: any, taskId: string): {
        task: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
    };
    copyTask(auth: string, req: any, taskId: string): {
        task: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
    };
    archiveTask(auth: string, req: any, taskId: string): {
        task: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
    };
    restoreTask(auth: string, req: any, taskId: string): {
        task: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        };
    };
    updateProfile(auth: string, req: any, body: any): {
        user: {
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
            customWallpaper?: string;
            customBlur?: number;
        };
    };
    changePassword(auth: string, req: any, body: any): {
        ok: boolean;
    };
    updateMember(auth: string, req: any, projectId: string, memberId: string, body: any): {
        member: {
            id: string;
            projectId: string;
            userId: string;
            role: string;
        };
    };
    removeMember(auth: string, req: any, projectId: string, memberId: string): {
        ok: boolean;
    };
    listIpEntries(auth: string, req: any, userId?: string): {
        entries: {
            id: string;
            userId: string;
            value: string;
            note?: string;
            enabled: boolean;
        }[];
        policies: {
            userId: string;
            enabled: boolean;
        }[];
    };
    addIpEntry(auth: string, req: any, body: any): {
        entry: {
            id: string;
            userId: any;
            value: any;
            note: any;
            enabled: boolean;
            createdBy: string;
            createdAt: string;
        };
    };
    removeIpEntry(auth: string, req: any, entryId: string): {
        ok: boolean;
    };
    toggleIpPolicy(auth: string, req: any, body: any): {
        policy: {
            userId: string;
            enabled: boolean;
        };
    };
    updateUser(auth: string, req: any, userId: string, body: any): {
        user: {
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
            customWallpaper?: string;
            customBlur?: number;
        };
    };
    resetUserPassword(auth: string, req: any, userId: string, body: any): {
        ok: boolean;
    };
    userSessions(auth: string, req: any, userId: string): {
        sessions: {
            id: string;
            userId: string;
            ip: string;
            lastActivityAt: string;
            revoked: boolean;
            revokedReason: string | null | undefined;
        }[];
    };
    revokeSession(auth: string, req: any, sessionId: string): {
        ok: boolean;
    };
    changeUserRole(auth: string, req: any, userId: string, body: any): {
        user: {
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
            customWallpaper?: string;
            customBlur?: number;
        };
    };
    userProjects(auth: string, req: any, userId: string): {
        projects: {
            memberId: string;
            projectId: string;
            projectName: string;
            group: string;
            role: string;
        }[];
        allProjects: {
            id: string;
            name: string;
            group: string;
        }[];
    };
    assignProject(auth: string, req: any, userId: string, body: any): {
        member: {
            id: string;
            projectId: any;
            userId: string;
            role: any;
        };
    };
    removeProject(auth: string, req: any, userId: string, projectId: string): {
        ok: boolean;
    };
    createAcceptanceItem(auth: string, req: any, projectId: string, body: any): {
        item: {
            id: string;
            projectId: string;
            title: any;
            status: any;
            note: any;
        };
    };
    updateAcceptanceItem(auth: string, req: any, itemId: string, body: any): {
        item: Record<string, any>;
    };
    deleteAcceptanceItem(auth: string, req: any, itemId: string): {
        ok: boolean;
    };
    updateRule(auth: string, req: any, ruleId: string, body: any): {
        rule: Record<string, any>;
    };
    deleteRule(auth: string, req: any, ruleId: string): {
        ok: boolean;
    };
    toggleRule(auth: string, req: any, ruleId: string): {
        rule: Record<string, any>;
    };
    updateChannel(auth: string, req: any, channelId: string, body: any): {
        channel: Record<string, any>;
    };
    deleteChannel(auth: string, req: any, channelId: string): {
        ok: boolean;
    };
    updateKey(auth: string, req: any, keyId: string, body: any): {
        key: {
            id: any;
            name: any;
            channelId: any;
            type: any;
            enabled: any;
            secretMasked: any;
        };
    };
    deleteKey(auth: string, req: any, keyId: string): {
        ok: boolean;
    };
    testNotification(auth: string, req: any, body: any): {
        log: {
            id: string;
            ruleId: any;
            event: any;
            projectId: string;
            channel: any;
            targetMode: string;
            targets: never[];
            status: string;
            message: any;
            retryCount: number;
            createdAt: string;
        };
    };
    search(auth: string, req: any, q?: string): {
        projects: {
            id: string;
            name: string;
            group: string;
            ownerId: string;
            status: "ACTIVE" | "ARCHIVED" | "DELETED";
            progress: number;
            risk: string;
            start: string;
            baselineEnd: string;
            currentEnd: string;
            description?: string;
            settings: Record<string, unknown>;
            acceptanceStatus: string;
        }[];
        tasks: {
            id: string;
            projectId: string;
            title: string;
            status: string;
            priority: string;
            baselineStart: string;
            baselineEnd: string;
            currentStart: string;
            currentEnd: string;
            dependencyIds: string[];
            note?: string;
        }[];
        files: {
            id: string;
            projectId: string;
            name: string;
            type: string;
            folder: string;
            content: string;
            version: number;
            frozenVersion?: number;
            ownerId: string;
            deleted: boolean;
        }[];
        members: {
            id: string;
            username: string;
            name: string;
            role: "SUPER_ADMIN" | "MEMBER";
            enabled: boolean;
            avatar: string;
            signature?: string;
            theme: string;
            customWallpaper?: string;
            customBlur?: number;
        }[];
    };
    uploadAvatar(auth: string, req: any, file: Express.Multer.File): {
        url: string;
        filename: string;
        size: number;
    };
}
