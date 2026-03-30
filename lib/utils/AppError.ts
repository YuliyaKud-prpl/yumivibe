export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_BLOCK_TYPE'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'DASHBOARD_NOT_FOUND'
  | 'BLOCK_NOT_FOUND'
  | 'RATE_LIMIT_GEMINI'
  | 'RATE_LIMIT_UNSPLASH'
  | 'RATE_LIMIT_WEATHER'
  | 'EXTERNAL_API_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static validation(
    message = 'Validation failed',
    details?: Record<string, unknown>
  ): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  static invalidBlockType(type: string): AppError {
    return new AppError(
      'INVALID_BLOCK_TYPE',
      `Invalid block type: ${type}`,
      400,
      { type }
    );
  }

  static invalidFileType(mimeType: string): AppError {
    return new AppError(
      'INVALID_FILE_TYPE',
      `Invalid file type: ${mimeType}. Allowed: jpg, png, webp`,
      400,
      { mimeType }
    );
  }

  static fileTooLarge(sizeBytes: number): AppError {
    return new AppError(
      'FILE_TOO_LARGE',
      'File exceeds maximum size of 5MB',
      400,
      { sizeBytes, maxBytes: 5 * 1024 * 1024 }
    );
  }

  static dashboardNotFound(id: string): AppError {
    return new AppError(
      'DASHBOARD_NOT_FOUND',
      `Dashboard not found: ${id}`,
      404,
      { dashboardId: id }
    );
  }

  static blockNotFound(id: string): AppError {
    return new AppError(
      'BLOCK_NOT_FOUND',
      `Block not found: ${id}`,
      404,
      { blockId: id }
    );
  }

  static rateLimitGemini(): AppError {
    return new AppError(
      'RATE_LIMIT_GEMINI',
      'Gemini API rate limit exceeded (15 requests/minute)',
      429
    );
  }

  static rateLimitUnsplash(): AppError {
    return new AppError(
      'RATE_LIMIT_UNSPLASH',
      'Unsplash API rate limit exceeded (50 requests/hour)',
      429
    );
  }

  static rateLimitWeather(): AppError {
    return new AppError(
      'RATE_LIMIT_WEATHER',
      'OpenWeatherMap API rate limit exceeded (1000 requests/day)',
      429
    );
  }

  static externalApiError(service: string, message: string): AppError {
    return new AppError(
      'EXTERNAL_API_ERROR',
      `External API error (${service}): ${message}`,
      502,
      { service }
    );
  }

  static databaseError(message?: string): AppError {
    return new AppError(
      'DATABASE_ERROR',
      message ?? 'A database error occurred',
      500
    );
  }

  static internal(message = 'An internal error occurred'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
