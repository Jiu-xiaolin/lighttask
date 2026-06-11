import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { Redis } from "ioredis";
import { AppConfigService } from "../config/app-config.service.js";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private ready = false;

  constructor(private config: AppConfigService) {}

  async onModuleInit() {
    const url = this.config.redisUrl;
    this.client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.client.on("ready", () => { this.ready = true; });
    this.client.on("end", () => { this.ready = false; });
    this.client.on("error", (error: Error) => {
      this.ready = false;
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
    try {
      await this.client.connect();
      this.ready = true;
      this.logger.log(`Redis connected: ${url}`);
    } catch (error: any) {
      this.ready = false;
      this.logger.error(`Redis required but unavailable: ${error?.message || error}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => undefined);
  }

  isReady() {
    return this.ready && !!this.client;
  }

  private assertReady() {
    if (!this.isReady()) throw new ServiceUnavailableException("Redis 服务不可用");
    return this.client!;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = this.assertReady();
    try {
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch (error) {
      this.logger.error(`Redis getJson failed for ${key}: ${error}`);
      throw error;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const client = this.assertReady();
    try {
      const raw = JSON.stringify(value);
      if (ttlSeconds) await client.set(key, raw, "EX", ttlSeconds);
      else await client.set(key, raw);
      return true;
    } catch (error) {
      this.logger.error(`Redis setJson failed for ${key}: ${error}`);
      throw error;
    }
  }

  async del(key: string) {
    const client = this.assertReady();
    try {
      await client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Redis del failed for ${key}: ${error}`);
      throw error;
    }
  }

  async delPattern(pattern: string) {
    const client = this.assertReady();
    try {
      const keys = await client.keys(pattern);
      if (!keys.length) return 0;
      return await client.del(...keys);
    } catch (error) {
      this.logger.error(`Redis delPattern failed for ${pattern}: ${error}`);
      throw error;
    }
  }

  async publish(channel: string, payload: unknown) {
    const client = this.assertReady();
    try {
      await client.publish(channel, JSON.stringify(payload));
      return true;
    } catch (error) {
      this.logger.error(`Redis publish failed for ${channel}: ${error}`);
      throw error;
    }
  }

  async invalidateBusinessCaches() {
    await Promise.all([
      this.delPattern("dashboard:stats:*"),
      this.delPattern("dashboard:gantt:*"),
      this.delPattern("search:*"),
    ]);
  }

  async ping() {
    try {
      const client = this.assertReady();
      return await client.ping() === "PONG";
    } catch {
      return false;
    }
  }

  async incrementWithTtl(key: string, ttlSeconds: number) {
    const client = this.assertReady();
    try {
      const value = await client.incr(key);
      if (value === 1) await client.expire(key, ttlSeconds);
      return value;
    } catch (error) {
      this.logger.error(`Redis incrementWithTtl failed for ${key}: ${error}`);
      throw error;
    }
  }

  async subscribe(channel: string, onMessage: (payload: any) => void) {
    const client = this.assertReady();
    const subscriber = client.duplicate({
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    const handler = (receivedChannel: string, raw: string) => {
      if (receivedChannel !== channel) return;
      try {
        onMessage(JSON.parse(raw));
      } catch {
        onMessage({ type: "unknown", raw, at: new Date().toISOString() });
      }
    };
    try {
      await subscriber.connect();
      subscriber.on("message", handler);
      await subscriber.subscribe(channel);
      return async () => {
        subscriber.off("message", handler);
        await subscriber.unsubscribe(channel).catch(() => undefined);
        await subscriber.quit().catch(() => undefined);
      };
    } catch (error: any) {
      this.logger.error(`Redis subscribe failed: ${error?.message || error}`);
      await subscriber.quit().catch(() => undefined);
      throw error;
    }
  }
}
