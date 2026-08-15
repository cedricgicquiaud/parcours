import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { creerApi, exigeRoleAdmin } from "./api";
import { ouvrirBase } from "./base";
import { NOM_COOKIE } from "./comptes/auth";
import { BaseComptes, MAX_TENTATIVES } from "./comptes/db";
import { BaseJetons } from "./comptes/jetons";
import { ExpediteurJournal } from "./courriel/envoi";
import { BaseReglages } from "./reglages";
import { MoteurRendu } from "./markdown/rendu";
import { BaseCriteres } from "./progression/criteres";
import { BaseProgression, UTILISATEUR_HERITE } from "./progression/db";
import { MoteurRecherche } from "./recherche/moteur";
import { cookieDeSession, creerContexteTest, MOT_DE_PASSE_TEST, type ContexteTest } from "./test-utils";

let rendu: MoteurRendu;

beforeAll(async () => {
  rendu = await MoteurRendu.creer();
}, 30_000);

// --- Contexte « vierge » : aucun compte, pour tester l'installation ---

describe("installation initiale (AU-R1)", () => {
  let dossier: string;
  let base: BaseProgression;
  let comptes: BaseComptes;
  let jetons: BaseJetons;
  let courriels: ExpediteurJournal;
  let app: ReturnType<typeof creerApi>;

  const appeler = (chemin: string, init: RequestInit = {}, jeton?: string) =>
    app.request(`http://127.0.0.1:4620${chemin}`, {
      ...init,
      headers: {
        host: "127.0.0.1:4620",
        "content-type": "application/json",
        ...(jeton ? { cookie: `${NOM_COOKIE}=${jeton}` } : {}),
        ...(init.headers ?? {}),
      },
    });

  beforeEach(async () => {
    dossier = await fs.mkdtemp(path.join(os.tmpdir(), "parcours-install-"));
    const ouverte = ouvrirBase(path.join(dossier, "parcours.db"));
    base = new BaseProgression(ouverte.db);
    comptes = new BaseComptes(ouverte.db);
    jetons = new BaseJetons(ouverte.db);
    courriels = new ExpediteurJournal(() => undefined);
    app = creerApi({
      dossierFormations: path.join(dossier, "formations"),
      base,
      criteres: new BaseCriteres(ouverte.db),
      comptes,
      jetons,
      reglages: new BaseReglages(ouverte.db),
      expediteur: courriels,
      rendu,
      recherche: new MoteurRecherche(rendu),
    });
  });

  afterEach(async () => {
    base.fermer();
    await fs.rm(dossier, { recursive: true, force: true });
  });

  it("refuse toute route tant qu'aucun compte n'existe", async () => {
    const reponse = await appeler("/api/formations");
    expect(reponse.status).toBe(503);
    expect(await reponse.json()).toMatchObject({ installation: true });
  });

  it("laisse passer la sonde de vie et l'état d'authentification", async () => {
    expect((await appeler("/api/health")).status).toBe(200);
    const etat = await (await appeler("/api/auth/etat")).json();
    expect(etat).toEqual({
      installationRequise: true,
      compte: null,
      inscriptionOuverte: false,
    });
  });

  it("crée le premier compte en administrateur et ouvre la session", async () => {
    const reponse = await appeler("/api/auth/installer", {
      method: "POST",
      body: JSON.stringify({
        identifiant: "Cedric@Exemple.fr",
        nom: "Cédric",
        motDePasse: "un-mot-de-passe-solide",
      }),
    });

    expect(reponse.status).toBe(201);
    const corps = await reponse.json();
    expect(corps.compte).toMatchObject({
      identifiant: "cedric@exemple.fr",
      nom: "Cédric",
      role: "admin",
      actif: true,
    });
    expect(JSON.stringify(corps)).not.toContain("scrypt");

    const cookie = reponse.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    // Le catalogue répond maintenant, avec la session tout juste ouverte.
    const jeton = cookieDeSession(reponse);
    expect((await appeler("/api/formations", {}, jeton!)).status).toBe(200);
  });

  it("donne au premier administrateur la progression d'avant les comptes", async () => {
    base.cocher(UTILISATEUR_HERITE, "prise-en-main", "bienvenue");
    const reponse = await appeler("/api/auth/installer", {
      method: "POST",
      body: JSON.stringify({ identifiant: "cedric@exemple.fr", motDePasse: "un-mot-de-passe-solide" }),
    });

    expect((await reponse.json()).progressionHeritee).toBe(1);
    const compte = comptes.ligneParIdentifiant("cedric@exemple.fr")!;
    expect([...base.leconsCochees(compte.id, "prise-en-main")]).toEqual(["bienvenue"]);
  });

  it("refuse un mot de passe trop court, et n'installe rien", async () => {
    const reponse = await appeler("/api/auth/installer", {
      method: "POST",
      body: JSON.stringify({ identifiant: "cedric@exemple.fr", motDePasse: "court" }),
    });
    expect(reponse.status).toBe(400);
    expect(comptes.installationRequise()).toBe(true);
  });

  it("refuse une seconde installation", async () => {
    const corps = JSON.stringify({
      identifiant: "cedric@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
    });
    await appeler("/api/auth/installer", { method: "POST", body: corps });
    const seconde = await appeler("/api/auth/installer", { method: "POST", body: corps });
    expect(seconde.status).toBe(409);
  });
});

// --- Contexte installé ---

describe("connexion et session (AU-R3 à AU-R6)", () => {
  let contexte: ContexteTest;

  beforeEach(async () => {
    contexte = await creerContexteTest({ rendu, prefixe: "parcours-auth-" });
  });

  afterEach(async () => {
    await contexte.fermer();
  });

  const connexion = (identifiant: string, motDePasse: string) =>
    contexte.appelerAnonyme("/api/auth/connexion", {
      method: "POST",
      body: JSON.stringify({ identifiant, motDePasse }),
    });

  it("refuse une requête sans session", async () => {
    const reponse = await contexte.appelerAnonyme("/api/formations");
    expect(reponse.status).toBe(401);
    expect((await reponse.json()).erreur).toMatch(/authentification requise/);
  });

  it("refuse un jeton de session inventé", async () => {
    const reponse = await contexte.appelerAnonyme("/api/formations", {
      headers: { cookie: `${NOM_COOKIE}=jeton-inventé` },
    });
    expect(reponse.status).toBe(401);
  });

  it("ouvre une session sur les bons identifiants", async () => {
    const reponse = await connexion("admin-test@parcours.test", MOT_DE_PASSE_TEST);
    expect(reponse.status).toBe(200);
    const jeton = cookieDeSession(reponse);
    expect(jeton).toBeTruthy();

    const suite = await contexte.appelerAnonyme("/api/formations", {
      headers: { cookie: `${NOM_COOKIE}=${jeton}` },
    });
    expect(suite.status).toBe(200);
  });

  it("donne la même réponse pour un compte inconnu et un mot de passe faux (AU-R4)", async () => {
    const inconnu = await connexion("personne@exemple.fr", "un-mot-de-passe-solide");
    const faux = await connexion("admin-test@parcours.test", "un-mot-de-passe-faux");

    expect(inconnu.status).toBe(401);
    expect(faux.status).toBe(401);
    expect(await inconnu.json()).toEqual(await faux.json());
  });

  it("bloque après trop d'échecs (AU-R5)", async () => {
    for (let essai = 0; essai < MAX_TENTATIVES; essai++) {
      await connexion("admin-test@parcours.test", "toujours-faux-celui-la");
    }
    const bloquee = await connexion("admin-test@parcours.test", MOT_DE_PASSE_TEST);
    expect(bloquee.status).toBe(429);
    expect((await bloquee.json()).erreur).toMatch(/réessayez dans 15 minutes/);
  });

  it("refuse la connexion d'un compte désactivé, sans le dire", async () => {
    await contexte.connecter("eleve");
    const eleve = contexte.comptes.ligneParIdentifiant("eleve@parcours.test")!;
    contexte.comptes.changerActivation(eleve.id, false);

    const reponse = await connexion("eleve@parcours.test", MOT_DE_PASSE_TEST);
    expect(reponse.status).toBe(401);
    expect((await reponse.json()).erreur).toMatch(/identifiant ou mot de passe/);
  });

  it("ferme la session à la déconnexion", async () => {
    const reponse = await contexte.appeler("/api/auth/deconnexion", { method: "POST" });
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("set-cookie")).toContain(`${NOM_COOKIE}=;`);
    expect((await contexte.appeler("/api/formations")).status).toBe(401);
  });

  it("déconnecte immédiatement un compte désactivé (CO-R9)", async () => {
    const appelerEleve = await contexte.connecter("eleve");
    expect((await appelerEleve("/api/formations")).status).toBe(200);

    const eleve = contexte.comptes.ligneParIdentifiant("eleve@parcours.test")!;
    contexte.comptes.changerActivation(eleve.id, false);
    expect((await appelerEleve("/api/formations")).status).toBe(401);
  });
});

describe("permissions par rôle (CO-R2)", () => {
  let contexte: ContexteTest;
  let appelerLecteur: ContexteTest["appeler"];

  beforeEach(async () => {
    contexte = await creerContexteTest({ rendu, prefixe: "parcours-roles-" });
    await contexte.appeler("/api/formations/import", {
      method: "POST",
      body: JSON.stringify({
        nom: "Mon cours",
        fichiers: [{ chemin: "Mon cours/a.md", contenu: "# A\n" }],
      }),
    });
    appelerLecteur = await contexte.connecter("eleve");
  });

  afterEach(async () => {
    await contexte.fermer();
  });

  it("laisse un lecteur lire et avancer dans une formation", async () => {
    expect((await appelerLecteur("/api/formations")).status).toBe(200);
    expect((await appelerLecteur("/api/formations/mon-cours/lecons/a")).status).toBe(200);
    const coche = await appelerLecteur("/api/progression/mon-cours/a", { method: "PUT" });
    expect(coche.status).toBe(200);
  });

  it("refuse à un lecteur toute écriture de formation", async () => {
    const refus = [
      await appelerLecteur("/api/formations", {
        method: "POST",
        body: JSON.stringify({ titre: "X", modules: [{ titre: "M", lecons: [{ titre: "L" }] }] }),
      }),
      await appelerLecteur("/api/formations/mon-cours/structure", {
        method: "PUT",
        body: JSON.stringify({ titre: "X", modules: [] }),
      }),
      await appelerLecteur("/api/formations/mon-cours/lecons/a/source", {
        method: "PUT",
        body: JSON.stringify({ markdown: "détourné" }),
      }),
      await appelerLecteur("/api/formations/mon-cours/archiver", { method: "POST" }),
      await appelerLecteur("/api/formations/mon-cours", { method: "DELETE" }),
      await appelerLecteur("/api/formations/import", {
        method: "POST",
        body: JSON.stringify({ nom: "X", fichiers: [] }),
      }),
    ];
    expect(refus.map((reponse) => reponse.status)).toEqual([403, 403, 403, 403, 403, 403]);
  });

  it("refuse à un lecteur les vues d'administration", async () => {
    expect((await appelerLecteur("/api/formations/mon-cours/structure")).status).toBe(403);
    expect(
      (await appelerLecteur("/api/formations/mon-cours/lecons/a/source")).status,
    ).toBe(403);
    expect((await appelerLecteur("/api/corbeille")).status).toBe(403);
    expect((await appelerLecteur("/api/utilisateurs")).status).toBe(403);
  });

  it("garde les progressions de deux comptes séparées (CO-R3)", async () => {
    await appelerLecteur("/api/progression/mon-cours/a", { method: "PUT" });

    const vueLecteur = await (await appelerLecteur("/api/formations/mon-cours")).json();
    const vueAdmin = await (await contexte.appeler("/api/formations/mon-cours")).json();
    expect(vueLecteur.avancement.faites).toBe(1);
    expect(vueAdmin.avancement.faites).toBe(0);
  });
});

describe("couverture de la garde de rôle (CO-R2)", () => {
  let contexte: ContexteTest;

  beforeEach(async () => {
    contexte = await creerContexteTest({ rendu, prefixe: "parcours-garde-" });
  });

  afterEach(async () => {
    await contexte.fermer();
  });

  /**
   * Filet de sécurité : toute route montée qui écrit doit passer par la garde
   * de rôle, sauf celles explicitement ouvertes (authentification, profil,
   * progression personnelle). Une route ajoutée plus tard sans y penser fait
   * échouer ce test.
   */
  it("protège toute route d'écriture qui n'est pas explicitement ouverte", async () => {
    const ouvertes = new Set([
      "POST /api/auth/installer",
      "POST /api/auth/connexion",
      "POST /api/auth/deconnexion",
      "POST /api/auth/inscription",
      "POST /api/auth/confirmer",
      "POST /api/auth/renvoyer-confirmation",
      "POST /api/auth/motdepasse-oublie",
      "POST /api/auth/motdepasse-reinitialiser",
      "PUT /api/profil",
      "PUT /api/profil/motdepasse",
      "PUT /api/progression/:fid/:lid",
      "DELETE /api/progression/:fid/:lid",
      "POST /api/progression/:fid/reset",
      "POST /api/progression/:fid/nettoyer",
      // Critères de réussite : progression personnelle, comme les leçons (CR-R14).
      "PUT /api/progression/:fid/:lid/criteres/:cid",
      "DELETE /api/progression/:fid/:lid/criteres/:cid",
    ]);

    const nonProtegees = contexte.app.routes
      .filter((route) => route.method !== "GET" && route.method !== "ALL")
      .filter((route) => route.path.startsWith("/api/"))
      .map((route) => `${route.method} ${route.path}`)
      .filter((cle) => !ouvertes.has(cle))
      .filter((cle) => {
        const [methode = "", chemin = ""] = cle.split(" ");
        return !exigeRoleAdmin(methode, chemin);
      });

    expect(nonProtegees).toEqual([]);
  });

  it("laisse la sonde de vie et l'état d'authentification ouverts", () => {
    expect(exigeRoleAdmin("GET", "/api/health")).toBe(false);
    expect(exigeRoleAdmin("GET", "/api/auth/etat")).toBe(false);
    expect(exigeRoleAdmin("GET", "/api/profil")).toBe(false);
  });
});

describe("profil (CO-R4, CO-R5)", () => {
  let contexte: ContexteTest;

  beforeEach(async () => {
    contexte = await creerContexteTest({ rendu, prefixe: "parcours-profil-" });
  });

  afterEach(async () => {
    await contexte.fermer();
  });

  it("renvoie le compte connecté, sans empreinte", async () => {
    const corps = await (await contexte.appeler("/api/profil")).json();
    expect(corps.compte).toMatchObject({ identifiant: "admin-test@parcours.test", role: "admin" });
    expect(JSON.stringify(corps)).not.toContain("scrypt");
  });

  it("change le nom d'affichage", async () => {
    const reponse = await contexte.appeler("/api/profil", {
      method: "PUT",
      body: JSON.stringify({ nom: "  Cédric   Gicquiaud " }),
    });
    expect((await reponse.json()).compte.nom).toBe("Cédric Gicquiaud");
  });

  it("exige le mot de passe actuel pour en changer", async () => {
    const reponse = await contexte.appeler("/api/profil/motdepasse", {
      method: "PUT",
      body: JSON.stringify({ actuel: "pas-le-bon", nouveau: "un-nouveau-mot-de-passe" }),
    });
    expect(reponse.status).toBe(403);
  });

  it("révoque les autres sessions au changement de mot de passe (CO-R4)", async () => {
    const autreJeton = contexte.comptes.ouvrirSession(contexte.utilisateurId);
    const autreSession = (chemin: string) =>
      contexte.appelerAnonyme(chemin, {
        headers: { cookie: `${NOM_COOKIE}=${autreJeton}` },
      });
    expect((await autreSession("/api/formations")).status).toBe(200);

    const reponse = await contexte.appeler("/api/profil/motdepasse", {
      method: "PUT",
      body: JSON.stringify({
        actuel: MOT_DE_PASSE_TEST,
        nouveau: "un-nouveau-mot-de-passe",
      }),
    });
    expect(await reponse.json()).toMatchObject({ change: true, sessionsRevoquees: 1 });

    // L'autre session est tombée, celle qui a agi tient toujours.
    expect((await autreSession("/api/formations")).status).toBe(401);
    expect((await contexte.appeler("/api/formations")).status).toBe(200);
  });

  it("refuse un nouveau mot de passe trop court", async () => {
    const reponse = await contexte.appeler("/api/profil/motdepasse", {
      method: "PUT",
      body: JSON.stringify({ actuel: MOT_DE_PASSE_TEST, nouveau: "court" }),
    });
    expect(reponse.status).toBe(400);
  });
});

describe("console d'administration des comptes (CO-R6 à CO-R10)", () => {
  let contexte: ContexteTest;

  beforeEach(async () => {
    contexte = await creerContexteTest({ rendu, prefixe: "parcours-console-" });
  });

  afterEach(async () => {
    await contexte.fermer();
  });

  const creer = (corps: unknown) =>
    contexte.appeler("/api/utilisateurs", { method: "POST", body: JSON.stringify(corps) });

  const modifier = (id: number, corps: unknown) =>
    contexte.appeler(`/api/utilisateurs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(corps),
    });

  it("liste les comptes sans jamais leur empreinte (CO-R10)", async () => {
    const reponse = await contexte.appeler("/api/utilisateurs");
    const corps = await reponse.json();
    expect(corps.utilisateurs).toHaveLength(1);
    expect(JSON.stringify(corps)).not.toContain("scrypt");
  });

  it("crée un compte lecteur", async () => {
    const reponse = await creer({
      identifiant: "eleve@exemple.fr",
      nom: "Un élève",
      motDePasse: "un-mot-de-passe-solide",
      role: "lecteur",
    });
    expect(reponse.status).toBe(201);
    expect((await reponse.json()).compte).toMatchObject({
      identifiant: "eleve@exemple.fr",
      role: "lecteur",
    });
  });

  it("refuse un identifiant déjà pris", async () => {
    const corps = {
      identifiant: "eleve@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "lecteur",
    };
    await creer(corps);
    expect((await creer(corps)).status).toBe(409);
  });

  it("refuse un rôle inventé", async () => {
    const reponse = await creer({
      identifiant: "eleve@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "roi",
    });
    expect(reponse.status).toBe(400);
  });

  it("change le rôle, le nom et l'identifiant d'un compte", async () => {
    const cree = await (await creer({
      identifiant: "eleve@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "lecteur",
    })).json();

    const reponse = await modifier(cree.compte.id, {
      nom: "Nouvelle identité",
      identifiant: "nouvelle-identite@exemple.fr",
      role: "admin",
    });
    expect((await reponse.json()).compte).toMatchObject({
      nom: "Nouvelle identité",
      identifiant: "nouvelle-identite@exemple.fr",
      role: "admin",
    });
  });

  it("refuse à un admin de changer son propre rôle ou de se désactiver (CO-R7)", async () => {
    const moi = contexte.utilisateurId;
    expect((await modifier(moi, { role: "lecteur" })).status).toBe(409);
    expect((await modifier(moi, { actif: false })).status).toBe(409);
  });

  it("protège le dernier administrateur actif (CO-R7)", async () => {
    // Un second admin, puis on retire le rôle au premier — permis.
    const second = await (await creer({
      identifiant: "second-admin@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "admin",
    })).json();
    expect((await modifier(second.compte.id, { role: "lecteur" })).status).toBe(200);

    // Il ne reste qu'un admin actif : on ne peut plus le toucher.
    const troisieme = await (await creer({
      identifiant: "autre-admin@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "admin",
    })).json();
    await modifier(troisieme.compte.id, { actif: false });
    expect((await modifier(troisieme.compte.id, { actif: true })).status).toBe(200);
  });

  it("réinitialise un mot de passe et ne le montre qu'une fois (CO-R10)", async () => {
    const cree = await (await creer({
      identifiant: "eleve@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "lecteur",
    })).json();

    // EM-R2 : le compte naît non confirmé ; on confirme pour pouvoir tester
    // la connexion avec le mot de passe provisoire.
    await contexte.appeler(`/api/utilisateurs/${cree.compte.id}/confirmer`, {
      method: "POST",
    });

    const reponse = await contexte.appeler(
      `/api/utilisateurs/${cree.compte.id}/motdepasse`,
      { method: "POST" },
    );
    const corps = await reponse.json();
    expect(corps.motDePasseProvisoire).toHaveLength(16);

    // Le nouveau mot de passe fonctionne, l'ancien non.
    const avec = (motDePasse: string) =>
      contexte.appelerAnonyme("/api/auth/connexion", {
        method: "POST",
        body: JSON.stringify({ identifiant: "eleve@exemple.fr", motDePasse }),
      });
    expect((await avec(corps.motDePasseProvisoire)).status).toBe(200);
    expect((await avec("un-mot-de-passe-solide")).status).toBe(401);

    // La liste ne le rejoue pas.
    const liste = await (await contexte.appeler("/api/utilisateurs")).json();
    expect(JSON.stringify(liste)).not.toContain(corps.motDePasseProvisoire);
  });

  it("ne supprime qu'un compte désactivé, et efface sa progression (CO-R8)", async () => {
    const cree = await (await creer({
      identifiant: "eleve@exemple.fr",
      motDePasse: "un-mot-de-passe-solide",
      role: "lecteur",
    })).json();
    const id = cree.compte.id;
    contexte.base.cocher(id, "formation", "lecon");

    expect((await contexte.appeler(`/api/utilisateurs/${id}`, { method: "DELETE" })).status)
      .toBe(409);

    await modifier(id, { actif: false });
    const reponse = await contexte.appeler(`/api/utilisateurs/${id}`, { method: "DELETE" });
    expect(await reponse.json()).toMatchObject({ supprime: true, progressionEffacee: 1 });
    expect(contexte.comptes.parId(id)).toBeNull();
  });

  it("refuse de supprimer son propre compte", async () => {
    const reponse = await contexte.appeler(
      `/api/utilisateurs/${contexte.utilisateurId}`,
      { method: "DELETE" },
    );
    expect(reponse.status).toBe(409);
  });

  it("répond 404 sur un compte inconnu et 400 sur un identifiant absurde", async () => {
    expect((await modifier(9999, { nom: "X" })).status).toBe(404);
    expect(
      (await contexte.appeler("/api/utilisateurs/abc", { method: "PATCH", body: "{}" }))
        .status,
    ).toBe(400);
  });
});
