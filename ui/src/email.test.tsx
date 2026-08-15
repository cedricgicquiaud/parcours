import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { Compte } from "./api";

const compte: Compte = {
  id: 1,
  identifiant: "cedric@exemple.fr",
  nom: "Cédric",
  role: "admin",
  actif: true,
  emailVerifie: true,
  creeLe: "2026-08-15T09:00:00.000Z",
  derniereConnexion: null,
};

const MESSAGE_NEUTRE =
  "Si cette adresse correspond à un compte, un courriel vient d'y être envoyé.";

function reponse(corps: unknown, statut = 200): Response {
  return { ok: statut < 400, status: statut, json: async () => corps } as Response;
}

let etat: unknown;
let appels: Array<{ url: string; corps: Record<string, unknown> | null }>;

function simuler(routes: (url: string, corps: unknown) => Response | null = () => null) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (entree: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entree);
      const corps = init?.body ? JSON.parse(String(init.body)) : null;
      appels.push({ url, corps });
      if (url === "/api/auth/etat") return reponse(etat);
      return (
        routes(url, corps) ?? reponse({ erreur: `route non simulée : ${url}` }, 404)
      );
    },
  );
}

beforeEach(() => {
  appels = [];
  etat = { installationRequise: false, compte: null, inscriptionOuverte: false };
  window.history.pushState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("inscription depuis l'écran de connexion (EM-R6)", () => {
  it("n'est pas proposée quand elle est fermée", async () => {
    simuler();
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });

    expect(screen.queryByRole("button", { name: "Créer un compte" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mot de passe oublié" })).toBeInTheDocument();
  });

  it("est proposée quand elle est ouverte, et renvoie un message neutre", async () => {
    etat = { installationRequise: false, compte: null, inscriptionOuverte: true };
    simuler((url) =>
      url === "/api/auth/inscription"
        ? reponse({ envoye: true, message: MESSAGE_NEUTRE })
        : null,
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });

    await userEvent.click(screen.getByRole("button", { name: "Créer un compte" }));
    await screen.findByRole("heading", { name: "Créer un compte" });

    await userEvent.type(screen.getByLabelText("Adresse e-mail"), "moi@exemple.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "un-mot-de-passe-long");
    await userEvent.type(
      screen.getByLabelText(/Confirmer le mot de passe/),
      "un-mot-de-passe-long",
    );
    await userEvent.click(screen.getByRole("button", { name: /Créer mon compte/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(MESSAGE_NEUTRE);
  });

  it("refuse deux mots de passe différents sans appeler le serveur", async () => {
    etat = { installationRequise: false, compte: null, inscriptionOuverte: true };
    simuler();
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });
    await userEvent.click(screen.getByRole("button", { name: "Créer un compte" }));

    await userEvent.type(screen.getByLabelText("Adresse e-mail"), "moi@exemple.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "un-mot-de-passe-long");
    await userEvent.type(screen.getByLabelText(/Confirmer/), "un-autre-mot-de-passe");
    await userEvent.click(screen.getByRole("button", { name: /Créer mon compte/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ne correspondent pas/);
    expect(appels.some((appel) => appel.url === "/api/auth/inscription")).toBe(false);
  });
});

describe("adresse non confirmée (EM-R4, EM-R5)", () => {
  it("propose de renvoyer le lien quand la connexion est refusée pour ça", async () => {
    simuler((url) => {
      if (url === "/api/auth/connexion") {
        return reponse(
          { erreur: "adresse non confirmée : ouvrez le lien reçu", emailNonConfirme: true },
          403,
        );
      }
      if (url === "/api/auth/renvoyer-confirmation") {
        return reponse({ envoye: true, message: MESSAGE_NEUTRE });
      }
      return null;
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });

    await userEvent.type(screen.getByLabelText("Adresse e-mail"), "moi@exemple.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "un-mot-de-passe-long");
    await userEvent.click(screen.getByRole("button", { name: /Se connecter/ }));

    const renvoi = await screen.findByRole("button", {
      name: "Renvoyer le lien de confirmation",
    });
    await userEvent.click(renvoi);

    expect(await screen.findByRole("status")).toHaveTextContent(MESSAGE_NEUTRE);
    expect(
      appels.find((appel) => appel.url === "/api/auth/renvoyer-confirmation")?.corps,
    ).toEqual({ identifiant: "moi@exemple.fr" });
  });
});

describe("mot de passe oublié (EM-R8)", () => {
  it("envoie la demande et affiche le message neutre", async () => {
    simuler((url) =>
      url === "/api/auth/motdepasse-oublie"
        ? reponse({ envoye: true, message: MESSAGE_NEUTRE })
        : null,
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Se connecter" });

    await userEvent.click(screen.getByRole("button", { name: "Mot de passe oublié" }));
    await screen.findByRole("heading", { name: "Mot de passe oublié" });
    // Le champ de mot de passe disparaît : seule l'adresse est demandée.
    expect(screen.queryByLabelText("Mot de passe")).toBeNull();

    await userEvent.type(screen.getByLabelText("Adresse e-mail"), "moi@exemple.fr");
    await userEvent.click(screen.getByRole("button", { name: /Envoyer le lien/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(MESSAGE_NEUTRE);
  });
});

describe("liens reçus par courriel (EM-R3, EM-R9)", () => {
  it("confirme l'adresse dès l'ouverture du lien et entre dans l'application", async () => {
    window.history.pushState(null, "", "/confirmer?jeton=abc123");
    simuler((url) => (url === "/api/auth/confirmer" ? reponse({ compte }) : null));
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mes formations" })).toBeInTheDocument(),
    );
    expect(appels.find((appel) => appel.url === "/api/auth/confirmer")?.corps).toEqual({
      jeton: "abc123",
    });
    expect(window.location.pathname).toBe("/");
  });

  it("affiche l'erreur d'un lien périmé", async () => {
    window.history.pushState(null, "", "/confirmer?jeton=perime");
    simuler((url) =>
      url === "/api/auth/confirmer"
        ? reponse({ erreur: "ce lien est invalide, expiré ou a déjà été utilisé" }, 400)
        : null,
    );
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalide, expiré/);
  });

  it("signale un lien sans jeton", async () => {
    window.history.pushState(null, "", "/confirmer");
    simuler();
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/lien est incomplet/);
    expect(appels.some((appel) => appel.url === "/api/auth/confirmer")).toBe(false);
  });

  it("demande un nouveau mot de passe sur un lien de réinitialisation", async () => {
    window.history.pushState(null, "", "/reinitialiser?jeton=xyz");
    simuler((url) =>
      url === "/api/auth/motdepasse-reinitialiser" ? reponse({ compte }) : null,
    );
    render(<App />);

    await screen.findByRole("heading", { name: "Choisir un nouveau mot de passe" });
    await userEvent.type(
      screen.getByLabelText("Nouveau mot de passe"),
      "un-nouveau-mot-de-passe",
    );
    await userEvent.type(
      screen.getByLabelText(/Confirmer le mot de passe/),
      "un-nouveau-mot-de-passe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Changer le mot de passe/ }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mes formations" })).toBeInTheDocument(),
    );
    expect(
      appels.find((appel) => appel.url === "/api/auth/motdepasse-reinitialiser")?.corps,
    ).toEqual({ jeton: "xyz", motDePasse: "un-nouveau-mot-de-passe" });
  });

  it("réutilise le jeton réémis quand le mot de passe est refusé (EM-R9)", async () => {
    window.history.pushState(null, "", "/reinitialiser?jeton=xyz");
    let premierEssai = true;
    simuler((url) => {
      if (url !== "/api/auth/motdepasse-reinitialiser") return null;
      if (premierEssai) {
        premierEssai = false;
        return reponse({ erreur: "mot de passe trop court", jeton: "nouveau-jeton" }, 400);
      }
      return reponse({ compte });
    });
    render(<App />);

    await screen.findByRole("heading", { name: "Choisir un nouveau mot de passe" });
    const saisir = async (valeur: string) => {
      await userEvent.clear(screen.getByLabelText("Nouveau mot de passe"));
      await userEvent.clear(screen.getByLabelText(/Confirmer le mot de passe/));
      await userEvent.type(screen.getByLabelText("Nouveau mot de passe"), valeur);
      await userEvent.type(screen.getByLabelText(/Confirmer le mot de passe/), valeur);
      await userEvent.click(
        screen.getByRole("button", { name: /Changer le mot de passe/ }),
      );
    };

    await saisir("court1234x");
    expect(await screen.findByRole("alert")).toHaveTextContent(/trop court/);

    await saisir("un-mot-de-passe-bien-plus-long");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mes formations" })).toBeInTheDocument(),
    );
    expect(
      appels.filter((appel) => appel.url === "/api/auth/motdepasse-reinitialiser").at(-1)
        ?.corps,
    ).toMatchObject({ jeton: "nouveau-jeton" });
  });
});
