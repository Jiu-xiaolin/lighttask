import { PrismaService } from "../../prisma/prisma.service.js";
import { EventService } from "../../common/events/event.service.js";
export declare class FileService {
    private prisma;
    private events;
    constructor(prisma: PrismaService, events: EventService);
    checkAccess(user: any, projectId: string): Promise<true | {
        id: string;
        userId: string;
        role: string;
        projectId: string;
        joinedAt: Date;
    }>;
    canEdit(user: any, projectId: string): Promise<boolean>;
    hasScope(user: any, projectId: string, scope: string): Promise<boolean>;
    filesOf(user: any, projectId: string): Promise<{
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
    }>;
    createFile(user: any, projectId: string, body: any): Promise<{
        file: {
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
        };
    }>;
    createUploadedFiles(user: any, projectId: string, uploads: Array<Express.Multer.File>): Promise<{
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
    }>;
    file(user: any, id: string): Promise<{
        file: {
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
        };
        versions: {
            id: string;
            createdBy: string;
            createdAt: Date;
            projectId: string;
            content: string | null;
            storagePath: string | null;
            version: number;
            kind: string;
            fileId: string;
        }[];
    }>;
    updateFile(user: any, id: string, body: any): Promise<{
        file: {
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
        };
    }>;
    downloadFile(user: any, id: string): Promise<{
        fileId: string;
        name: string;
        content: string | null;
        storagePath: string | null;
    }>;
    fileJob(user: any, id: string, type: "import" | "export", body: any): Promise<{
        job: {
            id: string;
            createdAt: Date;
            projectId: string;
            type: string;
            status: string;
            fileId: string | null;
            requestedBy: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            finishedAt: Date | null;
        };
        file: {
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
        };
    }>;
    fileCollection(user: any, projectId: string): Promise<{
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
