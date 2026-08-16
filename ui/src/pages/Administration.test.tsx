import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ErreurApi, type StructureFormation } from "../api";
import { Administration, apercuIdentifiant } from "./Administration";

const structure: StructureFormation = {
  id: "formation-claude",
  titre: "Formation pratique Claude",
  description: "Compagnon pratique",
  modules: [
    {
      id: "fondations",
      titre: "Fondations",
      lecons: [
        { id: "installer", titre: "Installer Claude Code" },
        { id: "mode-plan", titre: "Le mode plan" },
      ],
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apercuIdentifiant", () => {
  it("propose le même identifiant que le serveur", () => {
    expect(apercuIdentifiant("Écrire pour le web")).toBe("ecrire-pour-le-web");
    expect(apercuIdentifiant("Les hooks : à quoi ça sert ?")).toBe(
      "les-hooks-a-quoi-ca-sert",
    );
  });
});

describe("Administration — création (P008)", () => {
  it("dérive l'identifiant du titre, et le laisse corriger", async () => {
    render(<Administration fid={null} naviguer={() => undefined} />);
    await userEvent.type(
      screen.getByLabelText("Titre de la formation"),
      "Écrire pour le web",
    );
    const identifiant = screen.getByLabelText("Identifiant (nom du dossier)");
    expect(identifiant).toHaveValue("ecrire-pour-le-web");

    await userEvent.clear(identifiant);
    await userEvent.type(identifiant, "ecrire-web");
    await userEvent.type(screen.getByLabelText("Titre de la formation"), " bis");
    expect(identifiant).toHaveValue("ecrire-web");
  });

  it("envoie la structure saisie et ouvre la formation créée", async () => {
    const creer = vi
      .spyOn(api, "creerFormation")
      .mockResolvedValue({ id: "ecrire-pour-le-web", titre: "Écrire", fichiersCrees: [] });
    const naviguer = vi.fn();
    render(<Administration fid={null} naviguer={naviguer} />);

    await userEvent.type(
      screen.getByLabelText("Titre de la formation"),
      "Écrire pour le web",
    );
    await userEvent.type(screen.getByLabelText("Module 1"), "Bases");
    await userEvent.type(
      screen.getByLabelText("Leçon 1 du module 1"),
      "Structurer un texte",
    );
    await userEvent.click(screen.getByRole("button", { name: /Créer la formation/ }));

    await waitFor(() => expect(creer).toHaveBeenCalledOnce());
    expect(creer.mock.calls[0]![0]).toMatchObject({
      id: "ecrire-pour-le-web",
      titre: "Écrire pour le web",
      modules: [
        { titre: "Bases", lecons: [{ titre: "Structurer un texte" }] },
      ],
    });
    expect(naviguer).toHaveBeenCalledWith({
      nom: "formation",
      fid: "ecrire-pour-le-web",
    });
  });

  it("ajoute et retire modules et leçons", async () => {
    render(<Administration fid={null} naviguer={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter un module" }));
    expect(screen.getByLabelText("Module 2")).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Ajouter une leçon" })[0]!,
    );
    expect(screen.getByLabelText("Leçon 2 du module 1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Retirer le module 2" }),
    );
    expect(screen.queryByLabelText("Module 2")).not.toBeInTheDocument();
  });

  it("garde au moins un module et une leçon", () => {
    render(<Administration fid={null} naviguer={() => undefined} />);
    expect(screen.getByRole("button", { name: "Retirer le module 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retirer la leçon 1" })).toBeDisabled();
  });

  it("affiche l'erreur du serveur sans perdre la saisie", async () => {
    vi.spyOn(api, "creerFormation").mockRejectedValue(
      new ErreurApi("le dossier « ecrire-web » existe déjà", 409),
    );
    render(<Administration fid={null} naviguer={() => undefined} />);
    await userEvent.type(screen.getByLabelText("Titre de la formation"), "Écrire web");
    await userEvent.type(screen.getByLabelText("Module 1"), "Bases");
    await userEvent.type(screen.getByLabelText("Leçon 1 du module 1"), "Intro");
    await userEvent.click(screen.getByRole("button", { name: /Créer la formation/ }));

    expect(await screen.findByText(/existe déjà/)).toBeInTheDocument();
    expect(screen.getByLabelText("Titre de la formation")).toHaveValue("Écrire web");
  });

  it("prévient que le texte des leçons n'est jamais touché", () => {
    render(<Administration fid={null} naviguer={() => undefined} />);
    expect(
      screen.getByText(/ne touche jamais au texte des leçons/),
    ).toBeInTheDocument();
  });
});

describe("Administration — modification (P008)", () => {
  function monter(naviguer = vi.fn()) {
    vi.spyOn(api, "structure").mockResolvedValue(structure);
    render(<Administration fid="formation-claude" naviguer={naviguer} />);
    return naviguer;
  }

  it("charge la structure existante et fige les identifiants", async () => {
    monter();
    expect(await screen.findByDisplayValue("Formation pratique Claude")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Installer Claude Code")).toBeInTheDocument();
    // L'identifiant de formation n'est plus modifiable une fois créé.
    expect(
      screen.queryByLabelText("Identifiant (nom du dossier)"),
    ).not.toBeInTheDocument();
    // Les clés de progression sont visibles mais non éditables.
    expect(
      screen.getAllByTitle("Clé de progression").map((noeud) => noeud.textContent),
    ).toEqual(["installer", "mode-plan"]);
  });

  it("renomme un titre en conservant l'identifiant de la leçon", async () => {
    const enregistrer = vi
      .spyOn(api, "enregistrerStructure")
      .mockResolvedValue({ id: "formation-claude", titre: "T", fichiersCrees: [] });
    monter();

    const champ = await screen.findByDisplayValue("Installer Claude Code");
    await userEvent.clear(champ);
    await userEvent.type(champ, "Installer Claude Code (2026)");
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));

    await waitFor(() => expect(enregistrer).toHaveBeenCalledOnce());
    expect(enregistrer.mock.calls[0]![1].modules[0]!.lecons[0]).toEqual({
      id: "installer",
      titre: "Installer Claude Code (2026)",
    });
  });

  it("réordonne les leçons sans toucher aux identifiants", async () => {
    const enregistrer = vi
      .spyOn(api, "enregistrerStructure")
      .mockResolvedValue({ id: "formation-claude", titre: "T", fichiersCrees: [] });
    monter();

    await screen.findByDisplayValue("Installer Claude Code");
    await userEvent.click(screen.getByRole("button", { name: "Monter la leçon 2" }));
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));

    await waitFor(() => expect(enregistrer).toHaveBeenCalledOnce());
    expect(
      enregistrer.mock.calls[0]![1].modules[0]!.lecons.map((l) => l.id),
    ).toEqual(["mode-plan", "installer"]);
  });

  it("envoie une leçon ajoutée sans identifiant", async () => {
    const enregistrer = vi
      .spyOn(api, "enregistrerStructure")
      .mockResolvedValue({ id: "formation-claude", titre: "T", fichiersCrees: [] });
    monter();

    await screen.findByDisplayValue("Installer Claude Code");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter une leçon" }));
    await userEvent.type(screen.getByLabelText("Leçon 3 du module 1"), "Les hooks");
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));

    await waitFor(() => expect(enregistrer).toHaveBeenCalledOnce());
    const lecons = enregistrer.mock.calls[0]![1].modules[0]!.lecons;
    expect(lecons[2]).toEqual({ titre: "Les hooks" });
  });

  it("signale une structure illisible", async () => {
    vi.spyOn(api, "structure").mockRejectedValue(
      new ErreurApi("formation invalide : modules[0].id manquant", 409),
    );
    render(<Administration fid="cassee" naviguer={vi.fn()} />);
    const alerte = await screen.findByRole("alert");
    expect(within(alerte).getByText(/modules\[0\]\.id manquant/)).toBeInTheDocument();
  });
});
