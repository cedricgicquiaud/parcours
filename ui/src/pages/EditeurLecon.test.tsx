import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ErreurApi, type ReponseSourceLecon } from "../api";
import { EditeurLecon } from "./EditeurLecon";

const source: ReponseSourceLecon = {
  formationId: "formation-claude",
  leconId: "les-hooks",
  titre: "Les hooks",
  fichier: "lecons/les-hooks.md",
  markdown: "Le contenu de cette leçon reste à écrire.\n",
  jeton: "1000-42",
};

function monter(naviguer = vi.fn()) {
  vi.spyOn(api, "sourceLecon").mockResolvedValue(source);
  vi.spyOn(api, "apercu").mockResolvedValue({ html: "<p>aperçu</p>" });
  render(
    <EditeurLecon fid="formation-claude" lid="les-hooks" naviguer={naviguer} />,
  );
  return naviguer;
}

const saisie = () => screen.getByLabelText("Markdown");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EditeurLecon (P009)", () => {
  it("charge le markdown existant du fichier", async () => {
    monter();
    await waitFor(() =>
      expect(saisie()).toHaveValue("Le contenu de cette leçon reste à écrire.\n"),
    );
    expect(screen.getByText("lecons/les-hooks.md")).toBeInTheDocument();
  });

  it("demande l'aperçu au serveur, jamais rendu côté client (A-R5)", async () => {
    const apercu = vi.spyOn(api, "apercu").mockResolvedValue({ html: "<p>rendu</p>" });
    vi.spyOn(api, "sourceLecon").mockResolvedValue(source);
    render(
      <EditeurLecon fid="formation-claude" lid="les-hooks" naviguer={vi.fn()} />,
    );

    await waitFor(() => expect(saisie()).toBeInTheDocument());
    await userEvent.clear(saisie());
    await userEvent.type(saisie(), "# Titre");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    await waitFor(() => expect(apercu).toHaveBeenCalled());
    expect(apercu.mock.calls.at(-1)![1]).toBe("# Titre");
    expect(await screen.findByText("rendu")).toBeInTheDocument();
  });

  it("n'active « Enregistrer » qu'une fois le texte modifié", async () => {
    monter();
    await waitFor(() => expect(saisie()).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Enregistrer/ })).toBeDisabled();

    await userEvent.type(saisie(), "Du texte.");
    expect(screen.getByRole("button", { name: /Enregistrer/ })).toBeEnabled();
    expect(screen.getByText("Modifications non enregistrées")).toBeInTheDocument();
  });

  it("enregistre en renvoyant le jeton reçu au chargement", async () => {
    const enregistrer = vi
      .spyOn(api, "enregistrerLecon")
      .mockResolvedValue({ jeton: "2000-99" });
    monter();
    await waitFor(() => expect(saisie()).toBeInTheDocument());

    await userEvent.clear(saisie());
    await userEvent.type(saisie(), "Un hook se déclenche.");
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));

    await waitFor(() => expect(enregistrer).toHaveBeenCalledOnce());
    expect(enregistrer.mock.calls[0]).toEqual([
      "formation-claude",
      "les-hooks",
      "Un hook se déclenche.",
      "1000-42",
    ]);
    expect(await screen.findByText("Enregistré")).toBeInTheDocument();
  });

  it("propose de recharger quand le fichier a changé ailleurs", async () => {
    vi.spyOn(api, "enregistrerLecon").mockRejectedValue(
      new ErreurApi("le fichier a changé depuis son ouverture", 409),
    );
    monter();
    await waitFor(() => expect(saisie()).toBeInTheDocument());

    await userEvent.type(saisie(), "Ma version.");
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));

    expect(await screen.findByText(/a changé depuis son ouverture/)).toBeInTheDocument();
    const rechargement = screen.getByRole("button", { name: "Recharger le fichier" });

    vi.spyOn(api, "sourceLecon").mockResolvedValue({
      ...source,
      markdown: "Version écrite ailleurs.",
      jeton: "3000-24",
    });
    await userEvent.click(rechargement);
    await waitFor(() => expect(saisie()).toHaveValue("Version écrite ailleurs."));
  });

  it("demande confirmation avant de fermer avec des modifications", async () => {
    const naviguer = monter();
    const confirmer = vi.spyOn(window, "confirm").mockReturnValue(false);
    await waitFor(() => expect(saisie()).toBeInTheDocument());

    await userEvent.type(saisie(), "Du texte.");
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(confirmer).toHaveBeenCalledOnce();
    expect(naviguer).not.toHaveBeenCalled();

    confirmer.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(naviguer).toHaveBeenCalledWith({
      nom: "lecon",
      fid: "formation-claude",
      lid: "les-hooks",
    });
  });

  it("ferme sans rien demander quand rien n'a changé", async () => {
    const naviguer = monter();
    const confirmer = vi.spyOn(window, "confirm");
    await waitFor(() => expect(saisie()).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(confirmer).not.toHaveBeenCalled();
    expect(naviguer).toHaveBeenCalledOnce();
  });

  it("signale une leçon illisible", async () => {
    vi.spyOn(api, "sourceLecon").mockRejectedValue(
      new ErreurApi("fichier de leçon introuvable ou illisible : lecons/x.md", 404),
    );
    render(
      <EditeurLecon fid="formation-claude" lid="les-hooks" naviguer={vi.fn()} />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /introuvable ou illisible/,
    );
  });
});
