type User = {
    id: string;
    username: string;
    passwordHash: string;
    name: string;
    role: "SUPER_ADMIN" | "MEMBER";
    enabled: boolean;
    avatar: string;
    signature?: string;
    theme: string;
    customWallpaper?: string;
    customBlur?: number;
};
type Project = {
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
type Member = {
    id: string;
    projectId: string;
    userId: string;
    role: string;
};
type Task = {
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
type Progress = {
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
type FileItem = {
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
type Session = {
    id: string;
    tokenHash: string;
    userId: string;
    ip: string;
    lastActivityAt: string;
    revoked: boolean;
    revokedReason?: string | null;
};
export declare class AppService {
    private users;
    private sessions;
    private ipPolicies;
    private ipEntries;
    private projects;
    private members;
    private tasks;
    private progress;
    private files;
    private fileVersions;
    private submissions;
    private acceptanceItems;
    private acceptanceReports;
    private notificationRules;
    private notificationLogs;
    private channels;
    private keys;
    private timeline;
    private audit;
    private roleTemplates;
    private permissionScopes;
    private jobs;
    private collab;
    private ganttViews;
    private _dirty;
    private _saveTimer;
    constructor();
    private saveData;
    private markDirty;
    private hydrate;
    seed(): void;
    id(prefix: string): string;
    hash(value: string): string;
    today(): string;
    publicUser(user: User): {
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
    publicUserWithExtras(user: User): {
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
    mask(value?: string): string;
    addAudit(type: string, actorId: string, message: string): void;
    addTimeline(projectId: string, type: string, actor: User, message: string, color?: string): void;
    addNotification(event: string, projectId: string, actor: User, message: string): void;
    login(body: any, ip: string): {
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
    auth(token?: string, ip?: string): {
        user: User;
        session: Session;
    };
    isIpAllowed(userId: string, ip: string): boolean;
    isAdmin(user: User): boolean;
    visibleProjects(user: User): Project[];
    canAccess(user: User, projectId: string): boolean;
    canManage(user: User, projectId: string): boolean;
    canEdit(user: User, projectId: string): boolean;
    requireProject(user: User, id: string): Project;
    dashboard(user: User): {
        metrics: {
            activeProjects: number;
            todayActions: number;
            riskProjects: number;
            pendingFiles: number;
        };
        gantt: Task[];
        myProgress: Progress[];
    };
    listProjects(user: User, filter?: string, group?: string): {
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
    projectDetail(user: User, id: string): {
        project: Project;
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
    createProject(user: User, body: any): {
        project: Project;
    };
    updateProject(user: User, id: string, body: any): {
        project: Project;
    };
    archiveProject(user: User, id: string): {
        project: Project;
    };
    restoreProject(user: User, id: string): {
        project: Project;
    };
    settings(user: User, id: string, body: any): {
        project: Project;
    };
    membersOf(user: User, id: string): {
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
    invite(user: User, id: string, body: any): {
        member: Member;
    };
    tasksOf(user: User, projectId: string): {
        tasks: {
            progressItems: Progress[];
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
    createTask(user: User, projectId: string, body: any): {
        task: Task;
        progressItems: any;
        assignments: any;
    };
    updateProgress(user: User, id: string, body: any, action?: string): {
        progress: Progress;
        assignment: Progress;
    };
    submit(user: User, progressId: string, body: any): {
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
    filesOf(user: User, projectId: string): {
        files: FileItem[];
    };
    createFile(user: User, projectId: string, body: any): {
        file: FileItem;
    };
    file(user: User, id: string): {
        file: FileItem;
        versions: Record<string, unknown>[];
    };
    updateFile(user: User, id: string, body: any): {
        file: FileItem;
    };
    fileJob(user: User, id: string, type: "import" | "export", body: any): {
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
        file: FileItem;
    };
    acceptance(user: User, projectId: string): {
        items: Record<string, any>[];
        reports: Record<string, any>[];
    };
    startAcceptance(user: User, projectId: string): {
        project: Project;
    };
    approveAcceptance(user: User, projectId: string): {
        project: Project;
        frozenFiles: {
            id: string;
            version: number;
        }[];
    };
    report(user: User, projectId: string, body: any): {
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
    admin(user: User): void;
    health(user: User): {
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
    adminUsers(user: User): {
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
    createUser(user: User, body: any): {
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
    notif(): {
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
    createRule(user: User, body: any): {
        rule: {
            id: string;
            event: any;
            channel: any;
            targetMode: any;
            targets: any;
            enabled: boolean;
        };
    };
    createChannel(user: User, body: any): {
        channel: {
            id: string;
            name: any;
            type: any;
            enabled: boolean;
            config: any;
        };
    };
    createKey(user: User, body: any): {
        key: {
            id: string;
            name: any;
            channelId: any;
            type: any;
            enabled: boolean;
            secretMasked: string;
        };
    };
    retry(user: User, id: string): {
        log: Record<string, any>;
    };
    roles(user: User): {
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
    createRole(user: User, body: any): {
        role: {
            id: string;
            name: any;
            role: any;
            builtin: boolean;
            permissions: any;
        };
    };
    copyRoleTemplate(user: User, roleId: string): {
        role: {
            id: string;
            name: string;
            builtin: boolean;
        };
    };
    deleteRoleTemplate(user: User, roleId: string): {
        ok: boolean;
    };
    updateRolePermissions(user: User, roleId: string, body: any): {
        role: Record<string, any>;
    };
    createScope(user: User, body: any): {
        scope: {
            id: string;
            key: any;
            name: any;
            description: any;
            target: any;
            enabled: boolean;
        };
    };
    updateScope(user: User, scopeId: string, body: any): {
        scope: Record<string, any>;
    };
    deleteScope(user: User, scopeId: string): {
        ok: boolean;
    };
    getPermissionMatrix(): {
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
    auditLogs(user: User): {
        logs: Record<string, any>[];
    };
    realtime(user: User): {
        status: {
            onlineUsers: number;
            activeProjects: number;
            lowResourceMode: boolean;
        };
    };
    collabEvent(user: User, body: any): {
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
    memberGantt(user: User): {
        assignments: Progress[];
    };
    ganttViewsFor(user: User): {
        views: Record<string, any>[];
    };
    saveGanttView(user: User, body: any): {
        view: {
            id: any;
            userId: string;
            name: any;
            filters: any;
            columns: any;
            zoom: any;
        };
    };
    getTask(user: User, taskId: string): {
        task: {
            progressItems: Progress[];
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
    updateTask(user: User, taskId: string, body: any): {
        task: Task;
    };
    deleteTask(user: User, taskId: string): {
        task: Task;
    };
    copyTask(user: User, taskId: string): {
        task: Task;
    };
    archiveTask(user: User, taskId: string): {
        task: Task;
    };
    restoreTask(user: User, taskId: string): {
        task: Task;
    };
    updateProfile(user: User, body: any): {
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
    changePassword(user: User, body: any): {
        ok: boolean;
    };
    updateMember(user: User, projectId: string, memberId: string, body: any): {
        member: Member;
    };
    removeMember(user: User, projectId: string, memberId: string): {
        ok: boolean;
    };
    addIpEntry(user: User, body: any): {
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
    removeIpEntry(user: User, entryId: string): {
        ok: boolean;
    };
    toggleIpPolicy(user: User, body: any): {
        policy: {
            userId: string;
            enabled: boolean;
        };
    };
    listIpEntries(user: User, targetUserId?: string): {
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
    updateUser(user: User, targetUserId: string, body: any): {
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
    changeUserRole(user: User, targetUserId: string, body: any): {
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
    resetUserPassword(user: User, targetUserId: string, body: any): {
        ok: boolean;
    };
    userSessions(user: User, targetUserId: string): {
        sessions: {
            id: string;
            userId: string;
            ip: string;
            lastActivityAt: string;
            revoked: boolean;
            revokedReason: string | null | undefined;
        }[];
    };
    revokeSession(user: User, sessionId: string): {
        ok: boolean;
    };
    userProjects(user: User, targetUserId: string): {
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
    assignProject(user: User, targetUserId: string, body: any): {
        member: {
            id: string;
            projectId: any;
            userId: string;
            role: any;
        };
    };
    removeProject(user: User, targetUserId: string, projectId: string): {
        ok: boolean;
    };
    createAcceptanceItem(user: User, projectId: string, body: any): {
        item: {
            id: string;
            projectId: string;
            title: any;
            status: any;
            note: any;
        };
    };
    updateAcceptanceItem(user: User, itemId: string, body: any): {
        item: Record<string, any>;
    };
    deleteAcceptanceItem(user: User, itemId: string): {
        ok: boolean;
    };
    updateRule(user: User, ruleId: string, body: any): {
        rule: Record<string, any>;
    };
    deleteRule(user: User, ruleId: string): {
        ok: boolean;
    };
    toggleRule(user: User, ruleId: string): {
        rule: Record<string, any>;
    };
    updateChannel(user: User, channelId: string, body: any): {
        channel: Record<string, any>;
    };
    deleteChannel(user: User, channelId: string): {
        ok: boolean;
    };
    updateKey(user: User, keyId: string, body: any): {
        key: {
            id: any;
            name: any;
            channelId: any;
            type: any;
            enabled: any;
            secretMasked: any;
        };
    };
    deleteKey(user: User, keyId: string): {
        ok: boolean;
    };
    testNotification(user: User, body: any): {
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
    search(user: User, q: string): {
        projects: Project[];
        tasks: Task[];
        files: FileItem[];
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
    projectGroups(user: User): {
        groups: {
            name: string;
            count: number;
        }[];
    };
    dashboardFull(user: User): {
        metrics: {
            activeProjects: number;
            todayActions: number;
            riskProjects: number;
            pendingFiles: number;
            myCompletion: number;
            myDeltaDays: number;
        };
        pendingActions: {
            taskId: string;
            title: string;
            status: string;
            projectId: string;
            projectName: string;
            action: string;
        }[];
        riskItems: {
            projectId: string;
            name: string;
            risk: string;
            progress: number;
        }[];
        myProgress: Progress[];
    };
    getTaskFull(user: User, taskId: string): {
        task: {
            progressItems: {
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
            timeline: Record<string, any>[];
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
    fileCollection(user: User, projectId: string): {
        collection: {
            userId: string;
            userName: string;
            count: number;
            submitted: number;
            items: any[];
        }[];
        total: number;
    };
}
export {};
