import "dotenv/config";
import { Injectable } from "@nestjs/common";

type RuntimeEnv = "development" | "test" | "production";

@Injectable()
export class AppConfigService {
  readonly nodeEnv: RuntimeEnv;
  readonly isProduction: boolean;
  readonly port: number;
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  readonly redisUrl: string;
  readonly corsOrigins: string[];
  readonly rateLimitEnabled: boolean;
  readonly rateLimitWindowSeconds: number;
  readonly rateLimitMax: number;
  readonly loginRateLimitMax: number;
  readonly bodyLimit: string;
  readonly publicBaseUrl: string;

  constructor() {
    this.nodeEnv = this.readEnv();
    this.isProduction = this.nodeEnv === "production";
    this.port = this.readPort("APP_PORT", 3000);
    this.databaseUrl = this.require("DATABASE_URL");
    this.jwtSecret = this.readJwtSecret();
    this.redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    this.corsOrigins = this.readList("CORS_ORIGINS", process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173");
    this.rateLimitEnabled = this.readBool("RATE_LIMIT_ENABLED", true);
    this.rateLimitWindowSeconds = this.readInt("RATE_LIMIT_WINDOW_SECONDS", 60, 1, 3600);
    this.rateLimitMax = this.readInt("RATE_LIMIT_MAX", this.isProduction ? 240 : 600, 1, 10000);
    this.loginRateLimitMax = this.readInt("LOGIN_RATE_LIMIT_MAX", this.isProduction ? 10 : 60, 1, 1000);
    this.bodyLimit = process.env.BODY_LIMIT || "10mb";
    this.publicBaseUrl = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  }

  private readEnv(): RuntimeEnv {
    const value = (process.env.NODE_ENV || "development").toLowerCase();
    if (["development", "test", "production"].includes(value)) return value as RuntimeEnv;
    throw new Error(`Invalid NODE_ENV: ${value}`);
  }

  private require(key: string) {
    const value = process.env[key]?.trim();
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
  }

  private readJwtSecret() {
    const value = process.env.JWT_SECRET || (this.isProduction ? "" : "dev-only-change-me");
    if (!value) throw new Error("Missing required environment variable: JWT_SECRET");
    if (this.isProduction && value.length < 32) throw new Error("JWT_SECRET must be at least 32 characters in production");
    return value;
  }

  private readPort(key: string, fallback: number) {
    return this.readInt(key, fallback, 1, 65535);
  }

  private readInt(key: string, fallback: number, min: number, max: number) {
    const raw = process.env[key];
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${key} must be an integer between ${min} and ${max}`);
    }
    return value;
  }

  private readBool(key: string, fallback: boolean) {
    const raw = process.env[key];
    if (!raw) return fallback;
    return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
  }

  private readList(key: string, fallback: string) {
    return (process.env[key] || fallback).split(",").map((item) => item.trim()).filter(Boolean);
  }
}
