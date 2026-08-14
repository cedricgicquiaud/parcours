import { serve } from "@hono/node-server";
import { Hono } from "hono";

const PORT = 4620;

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok", app: "parcours" }));

serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, (info) => {
  console.log(`Parcours server listening on http://127.0.0.1:${info.port}`);
});
