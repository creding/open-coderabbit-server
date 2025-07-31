import http from "http";
import https from "https";
import fs from "fs";
import { WebSocketServer } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { appRouter, AppRouter } from "./router";
import { env } from "./constants";
import { logger } from "./utils/logger";
import { monitor } from "./utils/monitor";

let server: http.Server | https.Server;

const requestListener = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const startTime = Date.now();
  
  try {
    if (req.url === "/health" && req.method === "GET") {
      const healthStatus = monitor.getHealthStatus();
      const metrics = monitor.getMetrics();
      
      const healthData = {
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        uptime: metrics.system.uptime,
        memory: {
          used: Math.round(metrics.system.memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(metrics.system.memoryUsage.heapTotal / 1024 / 1024),
          usage: Math.round((metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100)
        },
        reviews: {
          total: metrics.reviews.total,
          active: metrics.reviews.inProgress,
          completed: metrics.reviews.completed,
          failed: metrics.reviews.failed,
          averageDuration: Math.round(metrics.reviews.averageDuration)
        },
        ai: {
          requests: metrics.ai.requests,
          successRate: metrics.ai.requests > 0 ? Math.round((metrics.ai.successful / metrics.ai.requests) * 100) : 100,
          averageDuration: Math.round(metrics.ai.averageDuration)
        },
        connections: metrics.connections,
        issues: healthStatus.issues
      };
      
      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;
      
      res.writeHead(statusCode, { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      });
      res.end(JSON.stringify(healthData, null, 2));
      
      logger.debug('Health check requested', { 
        status: healthStatus.status, 
        duration: Date.now() - startTime 
      });
    } else if (req.url === "/metrics" && req.method === "GET") {
      const metrics = monitor.getMetrics();
      res.writeHead(200, { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      });
      res.end(JSON.stringify(metrics, null, 2));
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  } catch (error) {
    logger.error('Error handling HTTP request', { 
      url: req.url, 
      method: req.method, 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
};

if (env.SSL === "true") {
  logger.info("SSL enabled");
  try {
    const serverOptions = {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    };
    server = https.createServer(serverOptions, requestListener);
    logger.info("SSL certificates loaded successfully");
  } catch (error) {
    logger.error("Failed to read SSL certificate files. Please ensure key.pem and cert.pem are present.", {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
} else {
  server = http.createServer(requestListener);
  logger.info("HTTP server created (SSL disabled)");
}

const wss = new WebSocketServer({ server });

// Add WebSocket connection monitoring
wss.on('connection', (ws, req) => {
  const clientId = req.headers['x-client-id'] as string || 'unknown';
  monitor.addConnection();
  logger.connectionEstablished(clientId);
  
  ws.on('close', () => {
    monitor.removeConnection();
    logger.connectionClosed(clientId);
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error', {
      clientId,
      error: error.message
    });
  });
});

const handler = applyWSSHandler<AppRouter>({ wss, router: appRouter });

const port = parseInt(env.PORT, 10);
server.listen(port, env.HOST, () => {
  const protocol = env.SSL === "true" ? "https" : "http";
  const serverUrl = `${protocol}://${env.HOST}:${port}`;
  
  logger.serverStarted(port, env.HOST, env.SSL === "true");
  console.log(`✅ CodeRabbit server listening on ${serverUrl}`);
  console.log(`📊 Health check: ${serverUrl}/health`);
  console.log(`📈 Metrics: ${serverUrl}/metrics`);
  
  // Log configuration
  logger.info('Server configuration', {
    port,
    host: env.HOST,
    ssl: env.SSL === "true",
    aiModel: env.AI_MODEL,
    logLevel: env.LOG_LEVEL,
    maxFileSize: env.MAX_FILE_SIZE,
    maxFiles: env.MAX_FILES_PER_REVIEW,
    rateLimit: `${env.RATE_LIMIT_REQUESTS} requests per ${parseInt(env.RATE_LIMIT_WINDOW_MS, 10) / 1000}s`
  });
  
  console.log(`🔍 Log level: ${env.LOG_LEVEL.toUpperCase()}`);
  console.log(`🤖 AI Model: ${env.AI_MODEL}`);
  console.log(`⚡ Rate limit: ${env.RATE_LIMIT_REQUESTS} requests per ${parseInt(env.RATE_LIMIT_WINDOW_MS, 10) / 1000}s`);
  console.log(`📁 Max files per review: ${env.MAX_FILES_PER_REVIEW}`);
  console.log(`📏 Max file size: ${parseInt(env.MAX_FILE_SIZE, 10) / 1024 / 1024}MB`);
  console.log(`⏱️  Review timeout: ${parseInt(env.REVIEW_TIMEOUT_MS, 10) / 1000}s`);
  console.log(``);
  console.log(`🚀 Server ready for code reviews!`);
});

// Graceful shutdown handling
let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn(`${signal} received again, forcing exit`);
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Set a timeout to force exit if shutdown takes too long
  const shutdownTimeout = setTimeout(() => {
    logger.error('Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 10000); // 10 seconds
  
  // Close WebSocket server first
  wss.close(() => {
    logger.info('WebSocket server closed');
    
    // Then close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      clearTimeout(shutdownTimeout);
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});
