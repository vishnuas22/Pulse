export type ApiErrorCode =
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'network'
  | 'storage'
  | 'unknown';

/** Same shape a real fetch() wrapper will throw later, so UI code survives
    the localStorage → HTTP swap unchanged. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
