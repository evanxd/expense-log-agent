import { Server } from "http";

import express from "express";

/**
 * Starts an Express server with a health check endpoint.
 *
 * @param port The port to listen on. Defaults to 3000.
 * @returns The server instance.
 */
export function startServer(port: number = 3000): Server {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    port = 3000;
  }
  const app = express();

  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  return server;
}
