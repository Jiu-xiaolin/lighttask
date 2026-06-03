export type User = { id: string; username: string; name: string; role: string; avatar: string; signature?: string; theme?: string; enabled?: boolean; customWallpaper?: string; customBlur?: number };
export type Project = { id: string; name: string; group: string; status: string; progress: number; risk: string; currentEnd: string; description?: string; acceptanceStatus?: string };
export type Task = { id: string; title: string; status: string; priority: string; currentEnd: string; progressItems?: ProgressItem[] };
export type ProgressItem = { id: string; status: string; progress: number; note?: string; currentEnd?: string; userId?: string };
export type FileItem = { id: string; name: string; type: string; folder: string; version: number; content?: string };
export type PageKey = "dashboard" | "project-list" | "workspace" | "files" | "messages" | "permissions" | "profile" | "support";
