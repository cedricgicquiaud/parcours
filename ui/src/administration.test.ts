import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAdministration } from "./administration";
import { api, ErreurApi } from "./api";
import type { EntreeDepot } from "./depot";

afterEach(() => {
  vi.restoreAllMocks();
});

function entree(chemin: string, contenu = "# Titre\n"): EntreeDepot {
  const fichier = new File([contenu], chemin.split("/").pop()!);
  return { chemin, fichier };
}

const depot = [entree("Mon cours/a.md"), entree("Mon cours/b.md")];

function monter() {
  const surChangement = vi.fn();
  const rendu = renderHook(() => useAdministration(surChangement));
  return { ...rendu, surChangement };
}

describe("useAdministration — import (G-R2, G-R5)", () => {
  it("importe le dossier déposé sous son nom", async () => {
    const importer = vi.spyOn(api, "importer").mockResolvedValue({
      id: "mon-cours",
      titre: "Mon cours",
      lecons: 2,
      manifesteGenere: true,
      ignores: [],
    });
    const { result, surChangement } = monter();

    await act(async () => {
      await result.current.importer(depot);
    });

    expect(importer).toHaveBeenCalledWith("Mon cours", expect.any(Array));
    expect(result.current.message).toMatch(/« Mon cours » importée — 2 leçons/);
    expect(result.current.message).toMatch(/Sommaire construit automatiquement/);
    expect(surChangement).toHaveBeenCalledOnce();
  });

  it("refuse un dépôt de fichiers isolés en disant quoi faire", async () => {
    const { result } = monter();

    await act(async () => {
      await result.current.importer([entree("a.md")]);
    });

    expect(result.current.erreur).toMatch(/dossier de la formation lui-même/);
  });

  it("demande avant de remplacer un formation.json refusé (G-R5)", async () => {
    const importer = vi
      .spyOn(api, "importer")
      .mockRejectedValueOnce(new ErreurApi("formatVersion manquant", 400, true))
      .mockResolvedValueOnce({
        id: "mon-cours",
        titre: "Mon cours",
        lecons: 2,
        manifesteGenere: true,
        ignores: [],
      });
    const confirmer = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { result } = monter();

    await act(async () => {
      await result.current.importer(depot);
    });

    expect(confirmer).toHaveBeenCalledOnce();
    expect(importer).toHaveBeenLastCalledWith("Mon cours", expect.any(Array), true);
    await waitFor(() => expect(result.current.message).toMatch(/importée/));
  });

  it("s'arrête si l'utilisateur refuse de déduire le sommaire", async () => {
    vi.spyOn(api, "importer").mockRejectedValue(
      new ErreurApi("formatVersion manquant", 400, true),
    );
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result, surChangement } = monter();

    await act(async () => {
      await result.current.importer(depot);
    });

    expect(result.current.erreur).toBe("formatVersion manquant");
    expect(surChangement).not.toHaveBeenCalled();
  });
});

describe("useAdministration — cycle de vie (G-R7, G-R11)", () => {
  it("archive sans rien demander : le geste est réversible", async () => {
    const archiver = vi.spyOn(api, "archiver").mockResolvedValue({ id: "mon-cours" });
    const confirmer = vi.spyOn(window, "confirm");
    const { result } = monter();

    await act(async () => {
      await result.current.archiver("mon-cours", "Mon cours");
    });

    expect(confirmer).not.toHaveBeenCalled();
    expect(archiver).toHaveBeenCalledWith("mon-cours");
    expect(result.current.message).toMatch(/archivée/);
  });

  it("demande confirmation avant la corbeille, et n'appelle rien si on renonce", async () => {
    const jeter = vi.spyOn(api, "mettreEnCorbeille");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result, surChangement } = monter();

    let fait: boolean | undefined;
    await act(async () => {
      fait = await result.current.supprimer("mon-cours", "Mon cours");
    });

    expect(fait).toBe(false);
    expect(jeter).not.toHaveBeenCalled();
    expect(surChangement).not.toHaveBeenCalled();
  });

  it("annonce que la corbeille reste restaurable", async () => {
    vi.spyOn(api, "mettreEnCorbeille").mockResolvedValue({ entree: "mon-cours--1" });
    const confirmer = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { result } = monter();

    await act(async () => {
      await result.current.supprimer("mon-cours", "Mon cours");
    });

    expect(confirmer.mock.calls[0]![0]).toMatch(/déplacé, pas supprimé/);
    expect(result.current.message).toMatch(/dans la corbeille/);
  });

  it("relaie le message exact du serveur en cas d'échec", async () => {
    vi.spyOn(api, "restaurerArchive").mockRejectedValue(
      new ErreurApi("« mon-cours » existe déjà", 409),
    );
    const { result } = monter();

    await act(async () => {
      await result.current.restaurerArchive("mon-cours", "Mon cours");
    });

    expect(result.current.erreur).toBe("« mon-cours » existe déjà");
  });
});
