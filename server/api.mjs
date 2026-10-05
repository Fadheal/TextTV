export function createApiMiddleware() {
  let text = "";
  const clients = new Set();

  function broadcast() {
    const message = `data: ${JSON.stringify({ text })}\n\n`;
    for (const client of clients) client.write(message);
  }

  return function apiMiddleware(request, response, next) {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/api/events" && request.method === "GET") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      response.write(`data: ${JSON.stringify({ text })}\n\n`);
      clients.add(response);
      response.on("close", () => clients.delete(response));
      return;
    }

    if (url.pathname === "/api/text" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ text }));
      return;
    }

    if (url.pathname === "/api/text" && request.method === "PUT") {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) {
          response.writeHead(413);
          response.end("Text is too large");
          request.destroy();
        }
      });
      request.on("end", () => {
        if (response.writableEnded) return;
        try {
          const payload = JSON.parse(body);
          if (typeof payload.text !== "string") throw new Error("Invalid text");
          text = payload.text;
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ ok: true }));
          broadcast();
        } catch {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "Expected a text string" }));
        }
      });
      return;
    }

    next();
  };
}