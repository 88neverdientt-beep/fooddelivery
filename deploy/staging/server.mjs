// Local isolated HTTPS staging only. Not a general-purpose production gateway.
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
const file = process.env.FOOD_STAGING_CONFIG;
if (!file) throw new Error("External FOOD_STAGING_CONFIG is required");
const config = JSON.parse(fs.readFileSync(file, "utf8"));
if (
  config.host !== "127.0.0.1" ||
  config.port !== 18443 ||
  config.backend !== "http://127.0.0.1:18080" ||
  config.management !== "http://127.0.0.1:19090"
)
  throw new Error("Only approved loopback staging endpoints are supported");
const root = fs.realpathSync(config.distRoot);
if (!fs.existsSync(path.join(root, "index.html")))
  throw new Error("Built frontend artifact required");
const policy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests";
const cache = new Map();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
function headers(res, id) {
  res.setHeader("X-Request-ID", id);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader("Content-Security-Policy", policy);
  res.setHeader("Strict-Transport-Security", "max-age=300");
  res.setHeader("Cache-Control", "no-store");
}
function error(res, status) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "error",
      message: status === 503 ? "Service unavailable" : "Request rejected",
      data: null,
      errorCode: String(status),
    }),
  );
}
function body(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on("data", (part) => {
      size += part.length;
      if (size <= 1048576) parts.push(part);
    });
    req.on("end", () =>
      size > 1048576
        ? reject(Object.assign(new Error("body limit"), { status: 413 }))
        : resolve(Buffer.concat(parts)),
    );
    req.on("error", reject);
  });
}
function proxy(req, res, target, route, data, id) {
  const forwarded = {
    ...req.headers,
    host: req.headers.host,
    "x-request-id": id,
  };
  for (const key of Object.keys(forwarded))
    if (
      key === "forwarded" ||
      key.startsWith("x-forwarded-") ||
      [
        "x-real-ip",
        "connection",
        "proxy-authorization",
        "proxy-connection",
        "keep-alive",
        "te",
        "trailer",
        "upgrade",
        "transfer-encoding",
        "content-length",
      ].includes(key)
    )
      delete forwarded[key];
  if (data?.length) forwarded["content-length"] = String(data.length);
  const upstream = http.request(
    new URL(target + route),
    { method: req.method, headers: forwarded, timeout: 15000 },
    (reply) => {
      for (const [key, value] of Object.entries(reply.headers)) {
        if (
          value === undefined ||
          [
            "connection",
            "transfer-encoding",
            "content-security-policy",
            "strict-transport-security",
            "x-request-id",
          ].includes(key)
        )
          continue;
        res.setHeader(
          key,
          key === "set-cookie"
            ? value.map((cookie) =>
                cookie.replace(/;\s*Path=\/auth(?=;|$)/i, "; Path=/api/auth"),
              )
            : value,
        );
      }
      res.writeHead(reply.statusCode || 502);
      reply.pipe(res);
    },
  );
  upstream.on("timeout", () => upstream.destroy());
  upstream.on("error", () => error(res, 503));
  if (data?.length) upstream.write(data);
  upstream.end();
}
const server = https.createServer(
  {
    key: fs.readFileSync(config.privateKeyPath),
    cert: fs.readFileSync(config.certificatePath),
    minVersion: "TLSv1.2",
  },
  async (req, res) => {
    const started = performance.now();
    const id = randomUUID();
    headers(res, id);
    res.on("finish", () =>
      process.stdout.write(
        JSON.stringify({
          requestId: id,
          method: req.method,
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started),
        }) + "\n",
      ),
    );
    try {
      if (!["localhost:18443", "127.0.0.1:18443"].includes(req.headers.host))
        return error(res, 421);
      const url = new URL(req.url, "https://localhost:18443");
      if (url.pathname === "/healthz") {
        if (req.method !== "GET") return error(res, 405);
        return proxy(
          req,
          res,
          config.management,
          "/actuator/health",
          undefined,
          id,
        );
      }
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        const route = url.pathname.slice(4) || "/";
        if (route.startsWith("/actuator")) return error(res, 404);
        if (Number(req.headers["content-length"] || 0) > 1048576) {
          req.resume();
          return error(res, 413);
        }
        const data = await body(req);
        return proxy(req, res, config.backend, route + url.search, data, id);
      }
      if (!["GET", "HEAD"].includes(req.method)) return error(res, 405);
      const decoded = decodeURIComponent(url.pathname);
      if (
        decoded.includes("\\") ||
        decoded.split("/").some((segment) => segment.startsWith("."))
      )
        return error(res, 404);
      let resolved = path.resolve(root, "." + decoded);
      if (resolved !== root && !resolved.startsWith(root + path.sep))
        return error(res, 404);
      let stat;
      try {
        stat = fs.statSync(resolved);
      } catch {
        /* only extensionless SPA routes fall back */
      }
      if (!stat?.isFile()) {
        if (path.extname(decoded)) return error(res, 404);
        resolved = path.join(root, "index.html");
        stat = fs.statSync(resolved);
      }
      const type = mime[path.extname(resolved)] || "application/octet-stream";
      let entry = cache.get(resolved);
      if (!entry || entry.modified !== stat.mtimeMs) {
        const raw = fs.readFileSync(resolved);
        entry = {
          modified: stat.mtimeMs,
          raw,
          gzip: gzipSync(raw),
          etag: '"' + createHash("sha256").update(raw).digest("hex") + '"',
        };
        cache.set(resolved, entry);
      }
      res.setHeader("Content-Type", type);
      res.setHeader("ETag", entry.etag);
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader(
        "Cache-Control",
        resolved === path.join(root, "index.html")
          ? "no-cache"
          : decoded.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
      );
      if (req.headers["if-none-match"] === entry.etag) {
        res.writeHead(304);
        return res.end();
      }
      const compressed = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
      const bytes = compressed ? entry.gzip : entry.raw;
      if (compressed) res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Content-Length", bytes.length);
      res.writeHead(200);
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch (e) {
      error(res, e.status === 413 ? 413 : 400);
    }
  },
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 100;
server.listen(config.port, config.host, () =>
  process.stdout.write(
    JSON.stringify({
      event: "staging-listening",
      port: config.port,
      loopbackOnly: true,
    }) + "\n",
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 20000).unref();
  });
