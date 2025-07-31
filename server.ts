import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { appRouter, AppRouter } from "./router";

// 1. Create a regular HTTP server
const server = http.createServer((req, res) => {
  // Handle the health check endpoint
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    // For other HTTP requests, you might want to return a 404
    res.writeHead(404);
    res.end();
  }
});

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
const port = 5353;
server.listen(port, () => {
  console.log(
    `✅ HTTP and WebSocket server listening on http://localhost:${port}`
  );
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down.");
  handler.broadcastReconnectNotification();
  wss.close();
  server.close();
});
