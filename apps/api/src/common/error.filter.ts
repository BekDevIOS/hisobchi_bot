import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const exception = error instanceof HttpException ? error : null;
    const status = exception?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception?.getResponse();
    const message = typeof raw === 'string' ? raw : (raw as { message?: string | string[] } | null)?.message ?? 'Internal server error';
    if (status >= 500) this.logger.error(error instanceof Error ? error.message : 'Unhandled error');
    response.status(status).json({ statusCode: status, code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message });
  }
}
