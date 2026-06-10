import { PrismaService } from "../../prisma/prisma.service.js";
export declare class ProfileService {
    private prisma;
    constructor(prisma: PrismaService);
    updateProfile(user: any, body: any): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            avatar: string;
            signature: string;
            theme: string;
            customWallpaper: any;
            customBlur: any;
        };
    }>;
    changePassword(user: any, body: any): Promise<{
        ok: boolean;
    }>;
}
