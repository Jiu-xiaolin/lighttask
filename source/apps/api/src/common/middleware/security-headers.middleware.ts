import type { NextFunction, Request, Response } from "express";

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("x-permitted-cross-domain-policies", "none");
  next();
}
