import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "服务器内部错误";
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as any).message || exception.message;
      details = typeof res === "object" ? (res as any).details || (res as any).errors : undefined;
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === "production" ? "服务器内部错误" : exception.message;
    }

    const requestInfo = `${request?.method || "UNKNOWN"} ${request?.originalUrl || request?.url || ""} requestId=${request?.requestId || "-"}`;
    if (status >= 500) {
      const error = exception instanceof Error ? exception : undefined;
      this.logger.error(`${requestInfo} ${error?.message || String(exception)}`, error?.stack);
    } else if (status >= 400) {
      this.logger.warn(`${requestInfo} ${Array.isArray(message) ? message.join("; ") : message}`);
    }

    response.status(status).json({
      message,
      statusCode: status,
      path: request?.originalUrl || request?.url,
      requestId: request?.requestId,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  }
}
