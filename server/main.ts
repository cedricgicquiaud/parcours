import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { creerApi } from "./api";
import { ouvrirBase } from "./base";
import { BaseComptes } from "./comptes/db";
import { cheminBaseProgression, dossierFormations, HOTE, PORT, RACINE_PROJET } from "./config";
import { MoteurRendu } from "./markdown/rendu";
import { BaseProgression } from "./progression/db";
import { MoteurRecherche } from "./recherche/moteur";

const DOSSIER_UI = path.join(RACINE_PROJET, "dist", "ui");

async function demarrer(): Promise<void> {
  const formations = dossierFormations();
  // Progression et comptes partagent l'unique base locale.
  const ouverte = ouvrirBase(cheminBaseProgression());
  const base = new BaseProgression(
    ouverte.db,
    ouverte.reinitialisee,
    ouverte.sauvegardeCorrompue,
  );
  const comptes = new BaseComptes(ouverte.db);
  const rendu = await MoteurRendu.creer();
  const recherche = new MoteurRecherche(rendu);

  const app = new Hono();
  app.route(
    "/",
    creerApi({ dossierFormations: formations, base, comptes, rendu, recherche }),
  );

  // En production, le même process sert l'UI construite (1 process, PRD).
  if (fs.existsSync(DOSSIER_UI)) {
    app.use("/*", serveStatic({ root: path.relative(process.cwd(), DOSSIER_UI) }));
    app.get("*", (c) => {
      const index = path.join(DOSSIER_UI, "index.html");
      return c.html(fs.readFileSync(index, "utf8"));
    });
  }

  const serveur = serve({ fetch: app.fetch, port: PORT, hostname: HOTE }, () => {
    console.log(`Parcours écoute sur http://${HOTE}:${PORT}`);
    console.log(`Formations : ${formations}`);
    if (comptes.installationRequise()) {
      console.log("Aucun compte : ouvrez Parcours pour créer le compte administrateur.");
    }
    if (base.reinitialisee) {
      console.warn(
        `Progression réinitialisée — base corrompue sauvegardée : ${base.sauvegardeCorrompue}`,
      );
    }
  });

  // F-R1 : port occupé → message clair sur stderr, sortie en erreur.
  serveur.on("error", (erreur: NodeJS.ErrnoException) => {
    if (erreur.code === "EADDRINUSE") {
      console.error(
        `Le port ${PORT} est déjà utilisé : Parcours tourne peut-être déjà. Arrêtez l'autre process puis relancez.`,
      );
    } else {
      console.error(`Démarrage impossible : ${erreur.message}`);
    }
    process.exit(1);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      base.fermer();
      process.exit(0);
    });
  }
}

demarrer().catch((erreur: unknown) => {
  console.error("Démarrage impossible :", erreur);
  process.exit(1);
});
