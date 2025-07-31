import http from "http";
import https from "https";
import fs from "fs";
import { WebSocketServer } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { appRouter, AppRouter } from "./router";
import { env } from "./constants";

let server: http.Server | https.Server;

const requestListener = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    res.writeHead(404);
    res.end();
  }
};

if (env.SSL === "true") {
  console.log("🔐 SSL enabled");
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

const wss = new WebSocketServer({ server });
const handler = applyWSSHandler<AppRouter>({ wss, router: appRouter });

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
