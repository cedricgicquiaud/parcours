import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { Compte } from "./api";

const compte: Compte = {
  id: 1,
  identifiant: "cedric",
  nom: "Cédric",
  role: "admin",
  actif: true,
  creeLe: "2026-08-15T09:00:00.000Z",
  derniereConnexion: null,
};

const catalogueVide = {
  formations: [],
  archivees: [],
  corbeille: [],
  progressionReinitialisee: false,
};

function reponse(corps: unknown, statut = 200): Response {
  return { ok: statut < 400, status: statut, json: async () => corps } as Response;
}

let etat: unknown;
let appels: Array<{ url: string; corps: unknown }>;

function simuler(surPost?: (url: string, corps: unknown) => Response | null) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree);
      const corps = init?.body ? JSON.parse(String(init.body)) : null;
      appels.push({ url, corps });

      if (url === "/api/auth/etat") return reponse(etat);
      const specifique = surPost?.(url, corps);
      if (specifique) return specifique;
      if (url === "/api/formations") return reponse(catalogueVide);
      return reponse({ erreur: `route non simulée : ${url}` }, 404);
    },
  );
}

beforeEach(() => {
  appels = [];
  etat = { installationRequise: false, compte: null };
  window.history.pushState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("écran d'installation (AU-R1)", () => {
  beforeEach(() => {
    etat = { installationRequise: true, compte: null };
  });

  it("propose de créer le compte administrateur au premier démarrage", async () => {
    simuler();
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Créer le compte administrateur" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmer le mot de passe/)).toBeInTheDocument();
  });

  it("refuse deux mots de passe différents sans appeler le serveur", async () => {
    simuler();
    render(<App />);
    await screen.findByRole("heading", { name: "Créer le compte administrateur" });

    await userEvent.type(screen.getByLabelText("Identifiant"), "cedric");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mot-de-passe-long");
    await userEvent.type(
      screen.getByLabelText(/Confirmer le mot de passe/),
      "un-autre-mot-de-passe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Créer le compte/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ne correspondent pas/,
    );
    expect(appels.some((appel) => appel.url === "/api/auth/installer")).toBe(false);
  });

  it("installe puis entre dans l'application", async () => {
    simuler((url) =>
      url === "/api/auth/installer"
        ? reponse({ compte, progressionHeritee: 0 }, 201)
        : null,
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Créer le compte administrateur" });

    await userEvent.type(screen.getByLabelText("Identifiant"), "cedric");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mot-de-passe-long");
    await userEvent.type(
      screen.getByLabelText(/Confirmer le mot de passe/),
      "mot-de-passe-long",
    );
    await userEvent.click(screen.getByRole("button", { name: /Créer le compte/ }));

    expect(
      await screen.findByRole("heading", { name: "Mes formations" }),
    ).toBeInTheDocument();
  });
});

describe("écran de connexion (AU-R6)", () => {
  it("s'affiche tant que personne n'est connecté", async () => {
    simuler();
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Se connecter" }),
    ).toBeInTheDocument();
    // Aucun contenu de formation n'est demandé avant la connexion.
    expect(appels.every((appel) => appel.url !== "/api/formations")).toBe(true);
  });

  it("relaie le message du serveur sur des identifiants refusés", async () => {
    simuler((url) =>
      url === "/api/auth/connexion"
        ? reponse({ erreur: "identifiant ou mot de passe incorrect" }, 401)
        : null,
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });

    await userEvent.type(screen.getByLabelText("Identifiant"), "cedric");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "faux");
    await userEvent.click(screen.getByRole("button", { name: /Se connecter/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "identifiant ou mot de passe incorrect",
    );
  });

  it("entre dans l'application après une connexion réussie", async () => {
    simuler((url) => (url === "/api/auth/connexion" ? reponse({ compte }) : null));
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });

    await userEvent.type(screen.getByLabelText("Identifiant"), "cedric");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mot-de-passe-long");
    await userEvent.click(screen.getByRole("button", { name: /Se connecter/ }));

    expect(
      await screen.findByRole("heading", { name: "Mes formations" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cédric")).toBeInTheDocument();
  });
});

describe("session connectée", () => {
  beforeEach(() => {
    etat = { installationRequise: false, compte };
  });

  it("montre le compte et permet de se déconnecter", async () => {
    simuler((url) =>
      url === "/api/auth/deconnexion" ? reponse({ deconnecte: true }) : null,
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Mes formations" });

    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(
      await screen.findByRole("heading", { name: "Se connecter" }),
    ).toBeInTheDocument();
  });

  it("ramène à la connexion si la session tombe en cours de route", async () => {
    simuler((url) =>
      url === "/api/formations"
        ? reponse({ erreur: "authentification requise" }, 401)
        : null,
    );
    // La deuxième interrogation d'état voit la session perdue.
    let premierAppel = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (entree: RequestInfo | URL) => {
        const url = String(entree);
        if (url === "/api/auth/etat") {
          const valeur = premierAppel
            ? { installationRequise: false, compte }
            : { installationRequise: false, compte: null };
          premierAppel = false;
          return reponse(valeur);
        }
        if (url === "/api/formations") {
          return reponse({ erreur: "authentification requise" }, 401);
        }
        return reponse({ erreur: "non simulée" }, 404);
      },
    );

    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Se connecter" }),
    ).toBeInTheDocument();
  });

  it("cache la console des comptes à un lecteur", async () => {
    etat = { installationRequise: false, compte: { ...compte, role: "lecteur" } };
    simuler();
    render(<App />);
    await screen.findByRole("heading", { name: "Mes formations" });

    expect(screen.queryByRole("link", { name: "Gérer les comptes" })).toBeNull();
  });

  it("ouvre le profil depuis la colonne latérale", async () => {
    simuler();
    render(<App />);
    await screen.findByRole("heading", { name: "Mes formations" });

    await userEvent.click(screen.getByRole("link", { name: /Cédric/ }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mon profil" })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Identifiant de connexion")).toHaveValue("cedric");
  });
});
