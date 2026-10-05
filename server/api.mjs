export function createApiMiddleware() {
  let text = "";
  const clients = new Set();
  const allowedOrigins = new Set(
    (process.env.TEXTTV_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  function broadcast() {
    const message = `data: ${JSON.stringify({ text })}\n\n`;
    for (const client of clients) client.write(message);
  }

  return function apiMiddleware(request, response, next) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) {
      next();
      return;
    }

    const origin = request.headers.origin;
    let sameOriginHost = false;
    if (origin) {
      try {
        sameOriginHost = new URL(origin).host === request.headers.host;
      } catch {}
    }
    if (origin && !allowedOrigins.has(origin) && !sameOriginHost) {
      response.writeHead(403).end("Origin not allowed");
      return;
    }

    if (origin) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
    }

    if (request.method === "OPTIONS") {
      response
        .writeHead(204, {
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
        })
        .end();
      return;
    }

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

    response.writeHead(404).end("API route not found");
  };
}
