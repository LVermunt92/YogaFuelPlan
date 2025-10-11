import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// PostgreSQL session store
const PgSession = ConnectPgSimple(session);

// Session middleware configuration with PostgreSQL store
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Extend session expiration on each request
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Auto-enable in production with HTTPS
    httpOnly: true,
    sameSite: 'lax', // Protect against CSRF while allowing normal navigation
    maxAge: 24 * 60 * 60 * 1000 // 1 day default (extended by remember me)
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Viral recipes are now permanently integrated into the unified database
  console.log('🔥 Viral recipes integrated into unified database - no separate scheduler needed');

  // Initialize Oura Ring auto-sync
  try {
    const { ouraAutoSync } = await import("./oura-auto-sync");
    console.log('🔄 Oura Ring auto-sync service initialized');
  } catch (error) {
    console.error("Failed to initialize Oura auto-sync:", error);
  }

  // Initialize automated recipe translation scheduler
  try {
    const { initializeTranslationScheduler } = await import("./recipe-translator");
    initializeTranslationScheduler();
    console.log('🌍 Recipe translation scheduler initialized successfully');
  } catch (error) {
    console.error("Failed to initialize recipe translation scheduler:", error);
  }

  // Development-only: Keep database alive during active development
  if (process.env.NODE_ENV !== 'production') {
    const { storage } = await import("./storage");
    const keepAliveInterval = setInterval(async () => {
      try {
        await storage.getUser(1); // Simple query to keep database active
        console.log('📡 Database keep-alive ping');
      } catch (error) {
        console.log('📡 Database keep-alive failed (normal if inactive)');
      }
    }, 4 * 60 * 1000); // Every 4 minutes

    // Clear interval on shutdown
    process.on('SIGTERM', () => clearInterval(keepAliveInterval));
    process.on('SIGINT', () => clearInterval(keepAliveInterval));
    console.log('📡 Database keep-alive enabled for development (pings every 4 minutes)');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
