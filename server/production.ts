import fs from "node:fs";
import path from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

/**
 * Monte l'interface construite sur l'application : en production, le même
 * process sert l'API et l'UI (1 process, PRD). No-op si le dossier n'existe
 * pas — en développement, Vite sert l'interface.
 *
 * L'interface est publique ; seule l'API exige une session (AU-R6). C'est la
 * régression « page blanche » de P011 que ce montage verrouille : une garde
 * posée sur `/` rendrait l'application inchargeable.
 */
export function servirInterface(app: Hono, dossierUi: string): void {
  if (!fs.existsSync(dossierUi)) return;
  app.use("/*", serveStatic({ root: path.relative(process.cwd(), dossierUi) }));
  // Toute adresse profonde (« /formation/… ») recharge la même page : c'est
  // le routeur côté client qui lit l'URL.
  app.get("*", (c) => {
    const index = path.join(dossierUi, "index.html");
    return c.html(fs.readFileSync(index, "utf8"));
  });
}
