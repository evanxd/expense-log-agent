import { Server } from "http";

import { startServer } from "../../src/utils/server";

describe("Server tests", () => {
  let server: Server;
  const port = 3001;

  afterEach((done) => {
    if (server) {
      server.close(done);
    }
  });

  it("should start the server and respond to health checks", async () => {
    server = startServer(port);
    const response = await fetch(`http://localhost:${port}/health`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe("OK");
  });

  it("should default to port 3000 if an invalid port is provided", async () => {
    server = startServer(-1);
    const response = await fetch("http://localhost:3000/health");
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe("OK");
  });
});
