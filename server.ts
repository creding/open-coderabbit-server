import http from "http";
import https from "https";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { appRouter, AppRouter } from "./router";
import { env } from "./constants";

// 1. Create a regular HTTP or HTTPS server
let server: http.Server | https.Server;

const requestListener = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  // Handle the health check endpoint
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    // For other HTTP requests, you might want to return a 404
    res.writeHead(404);
    res.end();
  }
};

if (env.SSL === "true") {
  console.log("🔐 SSL enabled");
  // To use SSL, you need to provide your own key and certificate files.
  // You can generate self-signed certificates for local development using OpenSSL:
  // openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes
  try {
    const serverOptions = {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    };
    server = https.createServer(serverOptions, requestListener);
  } catch (error) {
    console.error(
      "❌ Error reading SSL certificate files. Please ensure key.pem and cert.pem are present."
    );
    console.error(error);
    process.exit(1);
  }
} else {
  server = http.createServer(requestListener);
}

// 2. Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// 3. Apply the tRPC WebSocket handler
const handler = applyWSSHandler<AppRouter>({ wss, router: appRouter });

// 4. Add logging for connections and raw messages
wss.on("connection", (ws: WebSocket) => {
  // console.log(`➕➕ Connection opened (${wss.clients.size})`);
  // ws.on('message', (message: Buffer) => {
  //   console.log('➡️ Received raw message:', message.toString());
  // });
  // ws.once("close", () => {
  //   console.log(`➖➖ Connection closed (${wss.clients.size})`);
  // });
});

// 5. Start the server
const port = parseInt(env.PORT, 10);
server.listen(port, env.HOST, () => {
  const protocol = env.SSL === "true" ? "https" : "http";
  console.log(
    `✅ HTTP and WebSocket server listening on ${protocol}://${env.HOST}:${port}`
  );
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down.");
  handler.broadcastReconnectNotification();
  wss.close();
  server.close();
});
