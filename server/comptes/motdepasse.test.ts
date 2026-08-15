import { describe, expect, it } from "vitest";
import {
  hacher,
  motDePasseProvisoire,
  verifier,
  verifierForce,
} from "./motdepasse";

describe("verifierForce (AU-R2)", () => {
  it("refuse un mot de passe trop court", () => {
    expect(verifierForce("court")).toMatchObject({ ok: false });
    expect(verifierForce("123456789")).toMatchObject({ ok: false });
    expect(verifierForce("1234567890")).toMatchObject({ ok: true });
  });

  it("refuse un mot de passe égal à l'identifiant", () => {
    expect(verifierForce("cedric.dupont", "Cedric.Dupont")).toMatchObject({
      ok: false,
      erreur: "mot de passe identique à l'identifiant",
    });
  });

  it("refuse ce qui n'est pas du texte, et ce qui est démesuré", () => {
    expect(verifierForce(42)).toMatchObject({ ok: false });
    expect(verifierForce("a".repeat(201))).toMatchObject({ ok: false });
  });
});

describe("hacher / verifier (AU-R2)", () => {
  it("ne conserve jamais le mot de passe en clair", async () => {
    const empreinte = await hacher("un mot de passe correct");
    expect(empreinte).not.toContain("un mot de passe correct");
    expect(empreinte.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(empreinte.split("$")).toHaveLength(6);
  });

  it("produit une empreinte différente à chaque fois (sel aléatoire)", async () => {
    const [a, b] = await Promise.all([hacher("même mot de passe"), hacher("même mot de passe")]);
    expect(a).not.toBe(b);
  });

  it("reconnaît le bon mot de passe et rejette les autres", async () => {
    const empreinte = await hacher("le bon mot de passe");
    expect(await verifier("le bon mot de passe", empreinte)).toBe(true);
    expect(await verifier("le bon mot de passE", empreinte)).toBe(false);
    expect(await verifier("", empreinte)).toBe(false);
  });

  it("normalise les accents composés autrement", async () => {
    const empreinte = await hacher("café très sûr!".normalize("NFD"));
    expect(await verifier("café très sûr!".normalize("NFC"), empreinte)).toBe(true);
  });

  it("rejette une empreinte malformée sans lever d'exception", async () => {
    for (const empreinte of ["", "n'importe quoi", "scrypt$1$2$3", "bcrypt$1$8$1$a$b"]) {
      expect(await verifier("peu importe", empreinte)).toBe(false);
    }
  });

  it("rejette une empreinte aux paramètres absurdes", async () => {
    expect(await verifier("x", "scrypt$0$8$1$c2Vs$ZW1wcmVpbnRl")).toBe(false);
    expect(await verifier("x", "scrypt$16384$8$1$$")).toBe(false);
  });
});

describe("motDePasseProvisoire (CO-R10)", () => {
  it("produit un mot de passe assez long et sans caractère ambigu", () => {
    const genere = motDePasseProvisoire();
    expect(genere).toHaveLength(16);
    expect(genere).not.toMatch(/[0O1lI]/);
    expect(genere).not.toBe(motDePasseProvisoire());
  });
});
