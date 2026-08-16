import { describe, expect, it } from "vitest";
import {
  construireDepot,
  entreesDeSelection,
  ErreurDepot,
  nomDuDepot,
  type EntreeDepot,
} from "./depot";

function entree(chemin: string, contenu: BlobPart = "# Titre\n"): EntreeDepot {
  const nom = chemin.split("/").pop()!;
  const fichier = new File([contenu], nom);
  Object.defineProperty(fichier, "webkitRelativePath", { value: chemin });
  return { chemin, fichier };
}

describe("nomDuDepot", () => {
  it("prend le dossier commun à toutes les entrées", () => {
    expect(nomDuDepot([entree("Mon cours/a.md"), entree("Mon cours/b/c.md")])).toBe(
      "Mon cours",
    );
  });

  it("ne devine rien sur un dépôt de fichiers en vrac", () => {
    expect(nomDuDepot([entree("a.md"), entree("b.md")])).toBeNull();
    expect(nomDuDepot([entree("Cours/a.md"), entree("Autre/b.md")])).toBeNull();
    expect(nomDuDepot([])).toBeNull();
  });
});

describe("entreesDeSelection", () => {
  it("reprend le chemin relatif fourni par le navigateur", () => {
    const fichiers = [entree("Cours/lecons/a.md").fichier];
    expect(entreesDeSelection(fichiers)[0]!.chemin).toBe("Cours/lecons/a.md");
  });
});

describe("construireDepot", () => {
  it("envoie le markdown en texte et le reste en base64", async () => {
    const octets = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const fichiers = await construireDepot([
      entree("Cours/a.md"),
      entree("Cours/assets/logo.png", octets),
    ]);

    expect(fichiers[0]).toEqual({ chemin: "Cours/a.md", contenu: "# Titre\n" });
    expect(fichiers[1]).toEqual({
      chemin: "Cours/assets/logo.png",
      contenu: "iVBORw==",
      encodage: "base64",
    });
  });

  it("refuse un dépôt trop volumineux sans lire les fichiers", async () => {
    const gros = entree("Cours/gros.zip", new Uint8Array(10));
    Object.defineProperty(gros.fichier, "size", { value: 26_000_000 });

    await expect(construireDepot([gros])).rejects.toBeInstanceOf(ErreurDepot);
  });
});
