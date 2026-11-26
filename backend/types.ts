export interface Env {
  DB: D1Database;
  /** Optional. Public repository assets are served by GitHub Pages without R2. */
  BUCKET?: R2Bucket;
  FRONTEND_ORIGIN: string;
  FRONTEND_BASE_PATH?: string;
  ADMIN_KEY_HASH?: string;
  MEDIA_SIGNING_SECRET?: string;
}

export interface AdminSession {
  /** SHA-256 of the random bearer token. The raw token never enters D1. */
  tokenHash: string;
  expiresAt: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
