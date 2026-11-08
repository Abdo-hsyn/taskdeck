export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const notFound = (message = 'Resource not found') =>
  new AppError(message, 404, 'NOT_FOUND');

export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(message, 403, 'FORBIDDEN');

export const unauthenticated = (message = 'Authentication required') =>
  new AppError(message, 401, 'UNAUTHENTICATED');
