import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { Compte, ReponseCatalogue, ReponseFormation, ReponseLecon } from "./api";
import { CLE_EDITION } from "./preferences";

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
  criteres: [],
  criteresTronques: false,
  faite: false,
  position: 2,
  total: 2,
  precedente: { id: "bienvenue", titre: "Bienvenue" },
  suivante: null,
};

const ADMIN: Compte = {
  id: 1,
  identifiant: "cedric@exemple.fr",
  nom: "Cédric",
  role: "admin",
  actif: true,
  emailVerifie: true,
  creeLe: "2026-08-15T09:00:00.000Z",
  derniereConnexion: null,
};

const LECTEUR: Compte = { ...ADMIN, id: 2, nom: "Salomé", role: "lecteur" };

function reponse(corps: unknown, statut = 200): Response {
  return { ok: statut < 400, status: statut, json: async () => corps } as Response;
}

let appels: string[] = [];

function brancher(compte: Compte) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree);
      appels.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/auth/etat") {
        return reponse({ installationRequise: false, compte, inscriptionOuverte: false });
      }
      if (url === "/api/formations") return reponse(catalogue);
      if (url === "/api/formations/prise-en-main") return reponse(formation);
      if (url === "/api/formations/prise-en-main/structure") {
        return reponse({
          id: "prise-en-main",
          titre: "Prise en main de Parcours",
          modules: [
            {
              id: "decouverte",
              titre: "Découverte",
              lecons: [{ id: "anatomie", titre: "Anatomie" }],
            },
          ],
        });
      }
      if (url.endsWith("/source")) {
        return reponse({
          formationId: "prise-en-main",
          leconId: "anatomie",
          titre: "Anatomie",
          fichier: "lecons/anatomie.md",
          markdown: "Une formation est un dossier.",
          jeton: "1-1",
        });
      }
      if (url.startsWith("/api/formations/prise-en-main/lecons/")) return reponse(lecon);
      return reponse({ erreur: `route non simulée : ${url}` }, 404);
    },
  );
}

beforeEach(() => {
  appels = [];
  window.localStorage.clear();
  window.history.pushState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("l'interrupteur d'édition (ED-R3, ED-R12, ED-R13)", () => {
  it("est proposé à un administrateur, éteint", async () => {
    brancher(ADMIN);
    render(<App />);

    const bouton = await screen.findByRole("button", { name: "Activer l'édition" });
    expect(bouton).toHaveAttribute("aria-pressed", "false");
  });

  it("s'allume au clic, le dit et se voit", async () => {
    brancher(ADMIN);
    render(<App />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Activer l'édition" }),
    );

    const bouton = screen.getByRole("button", { name: "Désactiver l'édition" });
    expect(bouton).toHaveAttribute("aria-pressed", "true");
    expect(bouton).toHaveClass("actif");
  });

  it("n'existe pas pour un lecteur (ED-R3)", async () => {
    brancher(LECTEUR);
    render(<App />);

    await screen.findByText("EN COURS");
    expect(screen.queryByRole("button", { name: /l'édition/ })).not.toBeInTheDocument();
  });

  it("ignore la préférence laissée par quelqu'un d'autre (ED-R16)", async () => {
    window.localStorage.setItem(CLE_EDITION, "oui");
    brancher(LECTEUR);
    render(<App />);

    await screen.findByText("EN COURS");
    expect(screen.queryByRole("button", { name: /l'édition/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Nouvelle formation/ }),
    ).not.toBeInTheDocument();
  });
});

describe("basculer ne dérange rien (ED-R6, ED-R14)", () => {
  it("ne navigue pas et n'appelle pas le serveur", async () => {
    brancher(ADMIN);
    window.history.pushState(null, "", "/formation/prise-en-main/lecon/anatomie");
    render(<App />);

    await screen.findByRole("heading", { level: 1, name: "Anatomie" });
    const avant = appels.length;

    await userEvent.click(screen.getByRole("button", { name: "Activer l'édition" }));

    expect(window.location.pathname).toBe(
      "/formation/prise-en-main/lecon/anatomie",
    );
    expect(appels).toHaveLength(avant);
  });

  it("mémorise le choix d'une visite à l'autre (ED-R4)", async () => {
    brancher(ADMIN);
    const premiere = render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Activer l'édition" }),
    );
    premiere.unmount();

    render(<App />);
    expect(
      await screen.findByRole("button", { name: "Désactiver l'édition" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("rail replié (ED-R15)", () => {
  it("porte le même interrupteur pour un administrateur", async () => {
    window.localStorage.setItem("parcours.railReplie", "oui");
    brancher(ADMIN);
    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Activer l'édition" }),
    ).toBeInTheDocument();
  });

  it("n'en porte aucun pour un lecteur", async () => {
    window.localStorage.setItem("parcours.railReplie", "oui");
    brancher(LECTEUR);
    render(<App />);

    await waitFor(() => expect(appels).toContain("GET /api/formations"));
    expect(screen.queryByRole("button", { name: /l'édition/ })).not.toBeInTheDocument();
  });
});
