import { describe, expect, it } from "vitest";
import { normaliserEmail, verifierEmail } from "./email";

describe("verifierEmail (EM-R1)", () => {
  it("accepte les adresses courantes", () => {
    for (const adresse of [
      "cedric@exemple.fr",
      "cedric.gicquiaud@sous.domaine.co.uk",
      "c+parcours@exemple.io",
      "prenom_nom@exemple-formation.com",
      "a@b.co",
    ]) {
      expect(verifierEmail(adresse), adresse).toMatchObject({ ok: true });
    }
  });

  it("normalise la casse et les espaces", () => {
    expect(verifierEmail("  Cedric@Exemple.FR ")).toEqual({
      ok: true,
      valeur: "cedric@exemple.fr",
    });
    expect(normaliserEmail(" A@B.CO ")).toBe("a@b.co");
  });

  it("refuse ce qui ne recevra jamais de courrier", () => {
    for (const adresse of [
      "cedric",
      "cedric@",
      "@exemple.fr",
      "cedric@exemple",
      "cedric@exemple.f",
      "cedric @exemple.fr",
      "cedric@exemple.fr, autre@exemple.fr",
      "cedric@@exemple.fr",
      "cedric@.fr",
      ".cedric@exemple.fr",
      "cedric.@exemple.fr",
      "",
      "   ",
    ]) {
      expect(verifierEmail(adresse), adresse).toMatchObject({ ok: false });
    }
  });

  it("refuse ce qui n'est pas du texte, et ce qui est démesuré", () => {
    expect(verifierEmail(42)).toMatchObject({ ok: false });
    expect(verifierEmail(null)).toMatchObject({ ok: false });
    expect(verifierEmail(`${"a".repeat(250)}@exemple.fr`)).toMatchObject({ ok: false });
  });

  it("ne recopie pas une adresse démesurée dans son message d'erreur", () => {
    const resultat = verifierEmail(`${"a".repeat(200)}<@exemple.fr`);
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.erreur.length).toBeLessThan(130);
  });
});
