import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { creerContexteTest, MOT_DE_PASSE_TEST, type ContexteTest } from "./test-utils";
import { MoteurRendu } from "./markdown/rendu";

let rendu: MoteurRendu;
let contexte: ContexteTest;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

beforeEach(async () => {
  contexte = await creerContexteTest({ rendu, prefixe: "parcours-email-" });
});

afterEach(async () => {
  await contexte.fermer();
});

const poster = (chemin: string, corps: unknown) =>
  contexte.appelerAnonyme(chemin, { method: "POST", body: JSON.stringify(corps) });

/** Extrait le jeton du dernier courriel « envoyé ». */
function jetonDuDernierCourriel(): string | null {
  const dernier = contexte.courriels.envoyes.at(-1);
  if (!dernier) return null;
  return /jeton=([^\s&]+)/.exec(dernier.texte)?.[1] ?? null;
}

const ouvrirInscriptions = () =>
  contexte.appeler("/api/reglages", {
    method: "PUT",
    body: JSON.stringify({ inscriptionOuverte: true }),
  });

describe("inscription libre (EM-R6, EM-R7)", () => {
  it("est fermée par défaut", async () => {
    const reponse = await poster("/api/auth/inscription", {
      identifiant: "nouvelle@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
    });
    expect(reponse.status).toBe(403);
    expect(contexte.comptes.ligneParIdentifiant("nouvelle@exemple.fr")).toBeUndefined();
  });

  it("crée un compte lecteur non confirmé et envoie le lien", async () => {
    await ouvrirInscriptions();
    const reponse = await poster("/api/auth/inscription", {
      identifiant: "Nouvelle@Exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
    });

    expect(reponse.status).toBe(200);
    const compte = contexte.comptes.ligneParIdentifiant("nouvelle@exemple.fr");
    expect(compte).toMatchObject({ role: "lecteur", email_verifie: 0 });
    expect(contexte.courriels.envoyes.at(-1)?.destinataire).toBe("nouvelle@exemple.fr");
    expect(jetonDuDernierCourriel()).toBeTruthy();
  });

  it("refuse une adresse mal formée et un mot de passe trop court", async () => {
    await ouvrirInscriptions();
    expect(
      (await poster("/api/auth/inscription", {
        identifiant: "pas-une-adresse",
        motDePasse: "un-mot-de-passe-solide",
      })).status,
    ).toBe(400);
    expect(
      (await poster("/api/auth/inscription", {
        identifiant: "ok@exemple.fr",
        motDePasse: "court",
      })).status,
    ).toBe(400);
  });

  it("répond pareil sur une adresse déjà prise, sans créer de compte (EM-R7)", async () => {
    await ouvrirInscriptions();
    const corps = {
      identifiant: "nouvelle@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
    };
    const premiere = await poster("/api/auth/inscription", corps);
    const avant = contexte.comptes.lister().length;

    const seconde = await poster("/api/auth/inscription", {
      ...corps,
      motDePasse: "un-autre-mot-de-passe",
    });

    expect(seconde.status).toBe(premiere.status);
    expect(await seconde.json()).toEqual(await premiere.json());
    expect(contexte.comptes.lister()).toHaveLength(avant);
    // La personne concernée est prévenue, elle seule.
    expect(contexte.courriels.envoyes.at(-1)?.sujet).toMatch(/inscription a été tentée/);
  });
});

describe("confirmation d'adresse (EM-R2, EM-R3, EM-R4)", () => {
  async function inscrire(adresse = "nouvelle@exemple.fr") {
    await ouvrirInscriptions();
    await poster("/api/auth/inscription", {
      identifiant: adresse,
      motDePasse: "un-mot-de-passe-solide",
    });
    return jetonDuDernierCourriel()!;
  }

  it("refuse la connexion d'une adresse non confirmée, après le bon mot de passe", async () => {
    await inscrire();
    const reponse = await poster("/api/auth/connexion", {
      identifiant: "nouvelle@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
    });

    expect(reponse.status).toBe(403);
    expect(await reponse.json()).toMatchObject({ emailNonConfirme: true });
  });

  it("ne révèle rien à qui n'a pas le mot de passe (EM-R4)", async () => {
    await inscrire();
    const faux = await poster("/api/auth/connexion", {
      identifiant: "nouvelle@exemple.fr",
      motDePasse: "pas-le-bon-mot-de-passe",
    });
    const inconnu = await poster("/api/auth/connexion", {
      identifiant: "personne@exemple.fr",
      motDePasse: "pas-le-bon-mot-de-passe",
    });

    expect(faux.status).toBe(401);
    expect(await faux.json()).toEqual(await inconnu.json());
  });

  it("confirme l'adresse et ouvre la session", async () => {
    const jeton = await inscrire();
    const reponse = await poster("/api/auth/confirmer", { jeton });

    expect(reponse.status).toBe(200);
    expect((await reponse.json()).compte).toMatchObject({
      identifiant: "nouvelle@exemple.fr",
      emailVerifie: true,
    });
  });

  it("refuse un lien déjà utilisé ou inventé", async () => {
    const jeton = await inscrire();
    await poster("/api/auth/confirmer", { jeton });

    for (const essai of [{ jeton }, { jeton: "inventé" }, {}]) {
      const reponse = await poster("/api/auth/confirmer", essai);
      expect(reponse.status).toBe(400);
      expect((await reponse.json()).erreur).toMatch(/invalide, expiré/);
    }
  });

  it("renvoie le lien, toujours avec la même réponse (EM-R5)", async () => {
    await inscrire();
    const attendue = await (
      await poster("/api/auth/renvoyer-confirmation", {
        identifiant: "personne@exemple.fr",
      })
    ).json();

    const connue = await poster("/api/auth/renvoyer-confirmation", {
      identifiant: "nouvelle@exemple.fr",
    });
    expect(await connue.json()).toEqual(attendue);

    // Adresse déjà confirmée : même réponse, aucun envoi.
    const avant = contexte.courriels.envoyes.length;
    await poster("/api/auth/renvoyer-confirmation", {
      identifiant: contexte.adresseDe("admin-test"),
    });
    expect(contexte.courriels.envoyes).toHaveLength(avant);
  });

  it("n'envoie pas deux liens dans la même minute (EM-R5)", async () => {
    await inscrire();
    const avant = contexte.courriels.envoyes.length;
    await poster("/api/auth/renvoyer-confirmation", {
      identifiant: "nouvelle@exemple.fr",
    });
    expect(contexte.courriels.envoyes).toHaveLength(avant);
  });

  it("un compte créé par un administrateur naît non confirmé (EM-R2)", async () => {
    const reponse = await contexte.appeler("/api/utilisateurs", {
      method: "POST",
      body: JSON.stringify({
        identifiant: "eleve@exemple.fr",
        motDePasse: "un-mot-de-passe-solide",
        role: "lecteur",
      }),
    });

    expect((await reponse.json()).compte.emailVerifie).toBe(false);
    expect(contexte.courriels.envoyes.at(-1)?.destinataire).toBe("eleve@exemple.fr");
  });

  it("le premier administrateur est confirmé d'office (EM-R2)", async () => {
    const profil = await (await contexte.appeler("/api/profil")).json();
    expect(profil.compte.emailVerifie).toBe(true);
  });

  it("un administrateur peut confirmer une adresse à la main", async () => {
    const cree = await (
      await contexte.appeler("/api/utilisateurs", {
        method: "POST",
        body: JSON.stringify({
          identifiant: "eleve@exemple.fr",
          motDePasse: "un-mot-de-passe-solide",
          role: "lecteur",
        }),
      })
    ).json();

    const reponse = await contexte.appeler(
      `/api/utilisateurs/${cree.compte.id}/confirmer`,
      { method: "POST" },
    );
    expect((await reponse.json()).compte.emailVerifie).toBe(true);
  });
});

describe("mot de passe oublié (EM-R8, EM-R9)", () => {
  const oublie = (identifiant: string) =>
    poster("/api/auth/motdepasse-oublie", { identifiant });

  it("répond pareil pour une adresse connue et inconnue (EM-R8)", async () => {
    const connue = await oublie(contexte.adresseDe("admin-test"));
    const inconnue = await oublie("personne@exemple.fr");

    expect(connue.status).toBe(inconnue.status);
    expect(await connue.json()).toEqual(await inconnue.json());
    // Un seul courriel est parti : celui du compte qui existe.
    expect(contexte.courriels.envoyes).toHaveLength(1);
  });

  it("n'envoie rien à une adresse non confirmée", async () => {
    await ouvrirInscriptions();
    await poster("/api/auth/inscription", {
      identifiant: "nouvelle@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
    });
    const avant = contexte.courriels.envoyes.length;

    await oublie("nouvelle@exemple.fr");
    expect(contexte.courriels.envoyes).toHaveLength(avant);
  });

  it("réinitialise, révoque toutes les sessions et connecte (EM-R9)", async () => {
    const ancienneSession = contexte.appeler;
    await oublie(contexte.adresseDe("admin-test"));
    const jeton = jetonDuDernierCourriel()!;

    const reponse = await poster("/api/auth/motdepasse-reinitialiser", {
      jeton,
      motDePasse: "un-tout-nouveau-mot-de-passe",
    });
    expect(reponse.status).toBe(200);

    // L'ancienne session est tombée.
    expect((await ancienneSession("/api/formations")).status).toBe(401);

    // Le nouveau mot de passe fonctionne, l'ancien non.
    const avec = (motDePasse: string) =>
      poster("/api/auth/connexion", {
        identifiant: contexte.adresseDe("admin-test"),
        motDePasse,
      });
    expect((await avec("un-tout-nouveau-mot-de-passe")).status).toBe(200);
    expect((await avec(MOT_DE_PASSE_TEST)).status).toBe(401);
  });

  it("refuse un lien de réinitialisation déjà utilisé", async () => {
    await oublie(contexte.adresseDe("admin-test"));
    const jeton = jetonDuDernierCourriel()!;
    const corps = { jeton, motDePasse: "un-tout-nouveau-mot-de-passe" };

    await poster("/api/auth/motdepasse-reinitialiser", corps);
    const seconde = await poster("/api/auth/motdepasse-reinitialiser", corps);
    expect(seconde.status).toBe(400);
  });

  it("réémet le lien si le nouveau mot de passe est refusé", async () => {
    await oublie(contexte.adresseDe("admin-test"));
    const jeton = jetonDuDernierCourriel()!;

    const refus = await poster("/api/auth/motdepasse-reinitialiser", {
      jeton,
      motDePasse: "court",
    });
    expect(refus.status).toBe(400);
    const corps = await refus.json();
    expect(corps.jeton).toBeTruthy();

    // Le lien réémis fonctionne : pas besoin de repasser par la boîte mail.
    const reussite = await poster("/api/auth/motdepasse-reinitialiser", {
      jeton: corps.jeton,
      motDePasse: "un-tout-nouveau-mot-de-passe",
    });
    expect(reussite.status).toBe(200);
  });

  it("confirme l'adresse au passage : accéder à la boîte le prouve (EM-R9)", async () => {
    // Un compte créé par un admin, non confirmé, puis confirmé à la main pour
    // pouvoir demander une réinitialisation.
    const cree = await (
      await contexte.appeler("/api/utilisateurs", {
        method: "POST",
        body: JSON.stringify({
          identifiant: "eleve@exemple.fr",
          motDePasse: "un-mot-de-passe-solide",
          role: "lecteur",
        }),
      })
    ).json();
    await contexte.appeler(`/api/utilisateurs/${cree.compte.id}/confirmer`, {
      method: "POST",
    });

    await oublie("eleve@exemple.fr");
    const jeton = jetonDuDernierCourriel()!;
    await poster("/api/auth/motdepasse-reinitialiser", {
      jeton,
      motDePasse: "un-tout-nouveau-mot-de-passe",
    });

    expect(contexte.comptes.parId(cree.compte.id)?.emailVerifie).toBe(true);
  });
});

describe("envoi de courriel (EM-R10, EM-R11)", () => {
  it("n'ouvre aucune connexion sortante sans SMTP configuré", async () => {
    expect(contexte.courriels.mode).toBe("journal");
  });

  it("ne fait pas échouer la demande quand l'envoi échoue (EM-R11)", async () => {
    const envoi = vi
      .spyOn(contexte.courriels, "envoyer")
      .mockRejectedValue(new Error("smtp injoignable"));

    const reponse = await poster("/api/auth/motdepasse-oublie", {
      identifiant: contexte.adresseDe("admin-test"),
    });
    expect(reponse.status).toBe(200);
    expect(envoi).toHaveBeenCalled();
    envoi.mockRestore();
  });

  it("construit le lien sur l'URL publique réglée (EM-R12)", async () => {
    await contexte.appeler("/api/reglages", {
      method: "PUT",
      body: JSON.stringify({ urlPublique: "https://formations.exemple.fr/" }),
    });

    await poster("/api/auth/motdepasse-oublie", {
      identifiant: contexte.adresseDe("admin-test"),
    });
    expect(contexte.courriels.envoyes.at(-1)?.texte).toContain(
      "https://formations.exemple.fr/reinitialiser?jeton=",
    );
  });
});

describe("réglages (EM-R12)", () => {
  it("sont refusés à un lecteur", async () => {
    const appelerLecteur = await contexte.connecter("eleve");
    expect((await appelerLecteur("/api/reglages")).status).toBe(403);
    expect(
      (await appelerLecteur("/api/reglages", {
        method: "PUT",
        body: JSON.stringify({ inscriptionOuverte: true }),
      })).status,
    ).toBe(403);
  });

  it("refusent une URL publique inutilisable", async () => {
    for (const urlPublique of ["pas une url", "ftp://exemple.fr", 42]) {
      const reponse = await contexte.appeler("/api/reglages", {
        method: "PUT",
        body: JSON.stringify({ urlPublique }),
      });
      expect(reponse.status, String(urlPublique)).toBe(400);
    }
  });

  it("indiquent le mode d'envoi en cours", async () => {
    const corps = await (await contexte.appeler("/api/reglages")).json();
    expect(corps).toMatchObject({
      envoiCourriel: "journal",
      reglages: { inscriptionOuverte: false },
    });
  });
});
