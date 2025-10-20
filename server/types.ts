import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    rememberMe?: boolean;
  }
}

// Extend Express Request to include userId from JWT
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}