import { StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import { FileService } from "./file.service.js";
export declare class FileController {
    private readonly fileSvc;
    constructor(fileSvc: FileService);
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
    uploadFiles(user: any, projectId: string, files: Array<Express.Multer.File>): Promise<{
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
    getFile(user: any, fileId: string): Promise<{
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
    updateFile(user: any, fileId: string, body: any): Promise<{
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
    downloadFile(user: any, fileId: string, res: Response): Promise<StreamableFile>;
    importFile(user: any, fileId: string, body: any): Promise<{
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
    exportFile(user: any, fileId: string, body: any): Promise<{
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
