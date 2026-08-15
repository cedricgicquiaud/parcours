import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { ReponseCatalogue, ReponseFormation, ReponseLecon } from "./api";

const catalogue: ReponseCatalogue = {
  progressionReinitialisee: false,
  archivees: [],
  corbeille: [],
  formations: [
    {
      statut: "valide",
      id: "prise-en-main",
      titre: "Prise en main de Parcours",
      description: "Le format des formations, vu de l'intérieur.",
      modules: 1,
      lecons: 2,
      faites: 1,
      pourcentage: 50,
      action: "reprendre",
      prochaine: { id: "anatomie", titre: "Anatomie", moduleTitre: "Découverte" },
    },
  ],
};

const formation: ReponseFormation = {
  id: "prise-en-main",
  titre: "Prise en main de Parcours",
  description: "Le format des formations, vu de l'intérieur.",
  avancement: {
    faites: 1,
    total: 2,
    pourcentage: 50,
    action: "reprendre",
    prochaine: { id: "anatomie", titre: "Anatomie", moduleTitre: "Découverte" },
    orphelines: [],
    modules: [
      {
        id: "decouverte",
        titre: "Découverte",
        faites: 1,
        total: 2,
        lecons: [
          { id: "bienvenue", titre: "Bienvenue", faite: true },
          { id: "anatomie", titre: "Anatomie", faite: false },
        ],
      },
    ],
  },
};

const lecon: ReponseLecon = {
  formationId: "prise-en-main",
  formationTitre: "Prise en main de Parcours",
  leconId: "anatomie",
  titre: "Anatomie",
  moduleId: "decouverte",
  moduleTitre: "Découverte",
  html: "<p>Une formation est un dossier.</p>",
  faite: false,
  position: 2,
  total: 2,
  precedente: { id: "bienvenue", titre: "Bienvenue" },
  suivante: null,
};

/** Compte connecté par défaut dans ces tests (P011). */
const compte = {
  id: 1,
  identifiant: "cedric@exemple.fr",
  nom: "Cédric",
  role: "admin" as const,
  actif: true,
  emailVerifie: true,
  creeLe: "2026-08-15T09:00:00.000Z",
  derniereConnexion: null,
};

function reponse(corps: unknown, statut = 200): Response {
  return {
    ok: statut < 400,
    status: statut,
    json: async () => corps,
  } as Response;
}

let appels: string[] = [];
/** Permet à un test de simuler un contenu de leçon modifié côté serveur. */
let htmlLecon: string | null = null;

beforeEach(() => {
  appels = [];
  htmlLecon = null;
  window.history.pushState(null, "", "/");
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree);
      appels.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/auth/etat") {
        return reponse({ installationRequise: false, compte, inscriptionOuverte: false });
      }
      if (url === "/api/formations") return reponse(catalogue);
      if (url === "/api/formations/prise-en-main") return reponse(formation);
      if (url === "/api/formations/prise-en-main/apercu") {
        return reponse({ html: "<p>aperçu</p>" });
      }
      if (url.endsWith("/source")) {
        return init?.method === "PUT"
          ? reponse({ jeton: "2-2" })
          : reponse({
              formationId: "prise-en-main",
              leconId: "anatomie",
              titre: "Anatomie",
              fichier: "lecons/anatomie.md",
              markdown: "Une formation est un dossier.",
              jeton: "1-1",
            });
      }
      if (url.startsWith("/api/formations/prise-en-main/lecons/")) {
        // Après enregistrement, le serveur renvoie le contenu à jour.
        return reponse(htmlLecon ? { ...lecon, html: htmlLecon } : lecon);
      }
      if (url.startsWith("/api/progression/")) {
        return reponse({ faite: true, avancement: formation.avancement });
      }
      return reponse({ erreur: `route non simulée : ${url}` }, 404);
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App — parcours complet (§ 6)", () => {
  it("affiche le catalogue puis ouvre la prochaine leçon depuis « Reprendre »", async () => {
    render(<App />);

    // Le titre apparaît deux fois : dans la carte et dans la colonne latérale.
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 2, name: "Prise en main de Parcours" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("EN COURS")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Reprendre/ }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Anatomie"),
    );
    expect(window.location.pathname).toBe("/formation/prise-en-main/lecon/anatomie");
    expect(screen.getByText("Une formation est un dossier.")).toBeInTheDocument();
  });

  it("affiche le sommaire dans la colonne latérale pendant la lecture", async () => {
    window.history.pushState(null, "", "/formation/prise-en-main/lecon/anatomie");
    render(<App />);

    const sommaire = await screen.findByRole("navigation", {
      name: "Sommaire de la formation",
    });
    expect(sommaire).toHaveTextContent("Bienvenue");
    expect(sommaire).toHaveTextContent("Anatomie");
    expect(sommaire.querySelector('[aria-current="page"]')).toHaveTextContent(
      "Anatomie",
    );
  });

  it("coche la leçon de façon optimiste et appelle l'API (U-R3)", async () => {
    window.history.pushState(null, "", "/formation/prise-en-main/lecon/anatomie");
    render(<App />);

    const bouton = await screen.findByRole("button", {
      name: /Marquer comme terminé/,
    });
    await userEvent.click(bouton);

    expect(screen.getByRole("button", { name: /Terminé/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(appels).toContain("PUT /api/progression/prise-en-main/anatomie"),
    );
  });

  it("revient au catalogue par la marque de la colonne latérale", async () => {
    window.history.pushState(null, "", "/formation/prise-en-main/lecon/anatomie");
    render(<App />);

    await screen.findByRole("heading", { level: 1, name: "Anatomie" });
    await userEvent.click(screen.getByRole("link", { name: "Parcours" }));

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(await screen.findByText("EN COURS")).toBeInTheDocument();
  });

  it("réaffiche le contenu à jour en fermant l'éditeur de leçon", async () => {
    window.history.pushState(null, "", "/formation/prise-en-main/lecon/anatomie/editer");
    render(<App />);

    const saisie = await screen.findByLabelText("Markdown");
    await userEvent.clear(saisie);
    await userEvent.type(saisie, "Texte réécrit.");
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));
    await waitFor(() =>
      expect(appels).toContain(
        "PUT /api/formations/prise-en-main/lecons/anatomie/source",
      ),
    );

    // Le serveur renvoie désormais le contenu réécrit.
    htmlLecon = "<p>Texte réécrit.</p>";
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(await screen.findByText("Texte réécrit.")).toBeInTheDocument();
    expect(screen.queryByText("Une formation est un dossier.")).not.toBeInTheDocument();
  });

  it("affiche une page introuvable sur une URL inconnue", async () => {
    window.history.pushState(null, "", "/nulle-part");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Page introuvable" }),
    ).toBeInTheDocument();
  });
});
