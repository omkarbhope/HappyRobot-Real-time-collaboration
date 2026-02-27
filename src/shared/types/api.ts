export interface ApiSuccess<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function success<T>(data: T): ApiSuccess<T> {
  return { data };
}

export function apiError(error: string, code?: string): ApiError {
  return { error, code };
}
