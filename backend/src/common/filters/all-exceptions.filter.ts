import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred. Please try again later.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as { message?: string }).message ?? exception.message;
    } else if (exception instanceof Error) {
      // Handle payloadTooLarge / request entity too large
      const msg = exception.message.toLowerCase();
      if (msg.includes('payloadtoolarge') || msg.includes('entity too large') || msg.includes('request entity too large')) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'The uploaded file exceeds the allowed size (50 MB). Please reduce the file size and try again.';
      } else if (msg.includes('limit') && msg.includes('content')) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'The uploaded file exceeds the allowed size (50 MB). Please reduce the file size and try again.';
      } else {
        this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
        message = exception.message || 'An unexpected error occurred.';
      }
    }

    // Map status codes to friendly messages
    if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
      message = 'The uploaded file exceeds the allowed size (50 MB). Please reduce the file size and try again.';
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
