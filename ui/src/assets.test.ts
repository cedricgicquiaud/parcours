import { describe, expect, it } from "vitest";
import { urlAsset } from "./assets";

describe("adresse d'un fichier joint", () => {
  it("garde le chemin du manifeste entier derrière le segment de route", () => {
    expect(urlAsset("module-1", "assets/couverture.png")).toBe(
      "/api/formations/module-1/assets/assets/couverture.png",
    );
  });

  it("encode ce qui doit l'être", () => {
    expect(urlAsset("mon cours", "assets/ma couverture.png")).toBe(
      "/api/formations/mon%20cours/assets/assets/ma%20couverture.png",
    );
  });
});
