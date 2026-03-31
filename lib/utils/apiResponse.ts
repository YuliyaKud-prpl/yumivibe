import { NextResponse } from 'next/server';
import { AppError } from './AppError';

interface SuccessEnvelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  };
}

export const success = <T>(
  data: T,
  status = 200
): NextResponse<SuccessEnvelope<T>> => {
  return NextResponse.json({ data }, { status });
};

export const error = (
  appError: AppError
): NextResponse<ErrorEnvelope> => {
  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        status: appError.status,
        ...(appError.details ? { details: appError.details } : {}),
      },
    },
    { status: appError.status }
  );
};

export const fromCatch = (
  caught: unknown
): NextResponse<ErrorEnvelope> => {
  if (caught instanceof AppError) {
    return error(caught);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction
    ? 'An unexpected error occurred'
    : caught instanceof Error
      ? caught.message
      : 'An unexpected error occurred';
  const fallback = AppError.internal(message);
  return error(fallback);
};
