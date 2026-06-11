import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const logger = new Logger("HttpRequest");

export function requestIdMiddleware(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const requestId = Array.isArray(incoming) ? incoming[0] : incoming || randomUUID();
  const startedAt = Date.now();
  req.requestId = String(requestId);
  res.setHeader("x-request-id", req.requestId);
  res.on("finish", () => {
    const path = req.originalUrl || req.url || "";
    if (path.startsWith("/api/health")) return;

    const duration = Date.now() - startedAt;
    const message = `${req.method} ${path} ${res.statusCode} ${duration}ms requestId=${req.requestId}`;
    if (res.statusCode >= 500) logger.error(message);
    else if (res.statusCode >= 400) logger.warn(message);
    else logger.log(message);
  });
  next();
}
