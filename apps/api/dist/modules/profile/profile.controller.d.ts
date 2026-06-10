import { ProfileService } from "./profile.service.js";
export declare class ProfileController {
    private readonly profile;
    constructor(profile: ProfileService);
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
    uploadAvatar(user: any, file: Express.Multer.File): {
        url: string;
        filename: string;
        size: number;
    };
}
