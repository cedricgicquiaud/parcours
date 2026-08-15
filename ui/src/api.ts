import type { FichierDepose } from "../../server/formations/import";
import type {
  EntreeArchive,
  EntreeCorbeille,
  ReponseApercu,
  ReponseCorbeille,
  ReponseCorbeilleAjout,
  ReponseEcriture,
  ReponseEnregistrementSource,
  ReponseImport,
  ReponseSourceLecon,
  ReponseCatalogue,
  ReponseFormation,
  ReponseLecon,
  ReponseProgression,
  ReponseRechercheApi,
  ReponseSuppression,
} from "../../server/types-api";

export type {
  EntreeArchive,
  EntreeCorbeille,
  FichierDepose,
  ReponseApercu,
  ReponseCorbeille,
  ReponseCorbeilleAjout,
  ReponseEcriture,
  ReponseEnregistrementSource,
  ReponseImport,
  ReponseSourceLecon,
  ReponseCatalogue,
  ReponseFormation,
  ReponseLecon,
  ReponseProgression,
  ReponseRechercheApi,
  ReponseSuppression,
};

/** Structure éditable d'une formation, espace d'administration (P008). */
export interface StructureFormation {
  id: string;
  titre: string;
  description?: string;
  modules: Array<{
    id?: string;
    titre: string;
    lecons: Array<{ id?: string; titre: string }>;
  }>;
}

export type StructureSaisie = Omit<StructureFormation, "id"> & { id?: string };

/** Erreur d'API portant le message exact du serveur (A-R3). */
export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
    /** Import refusé pour cause de manifeste invalide : déduire est possible (G-R5). */
    readonly peutGenerer = false,
  ) {
    super(message);
    this.name = "ErreurApi";
  }
}

async function appeler<T>(chemin: string, init?: RequestInit): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(chemin, init);
  } catch {
    throw new ErreurApi("Parcours ne répond pas", 0);
  }
  const corps: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const objet = corps && typeof corps === "object" ? (corps as Record<string, unknown>) : {};
    const message =
      "erreur" in objet ? String(objet.erreur) : `erreur ${reponse.status}`;
    throw new ErreurApi(message, reponse.status, objet.peutGenerer === true);
  }
  return corps as T;
}

const id = encodeURIComponent;

export const api = {
  catalogue: () => appeler<ReponseCatalogue>("/api/formations"),

  formation: (fid: string) => appeler<ReponseFormation>(`/api/formations/${id(fid)}`),

  lecon: (fid: string, lid: string) =>
    appeler<ReponseLecon>(`/api/formations/${id(fid)}/lecons/${id(lid)}`),

  rechercher: (fid: string, requete: string, signal?: AbortSignal) =>
    appeler<ReponseRechercheApi>(
      `/api/formations/${id(fid)}/recherche?q=${encodeURIComponent(requete)}`,
      { signal },
    ),

  cocher: (fid: string, lid: string) =>
    appeler<ReponseProgression>(`/api/progression/${id(fid)}/${id(lid)}`, {
      method: "PUT",
    }),

  decocher: (fid: string, lid: string) =>
    appeler<ReponseProgression>(`/api/progression/${id(fid)}/${id(lid)}`, {
      method: "DELETE",
    }),

  reinitialiser: (fid: string) =>
    appeler<ReponseSuppression>(`/api/progression/${id(fid)}/reset`, {
      method: "POST",
    }),

  structure: (fid: string) =>
    appeler<StructureFormation>(`/api/formations/${id(fid)}/structure`),

  creerFormation: (structure: StructureSaisie) =>
    appeler<ReponseEcriture>("/api/formations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(structure),
    }),

  enregistrerStructure: (fid: string, structure: StructureSaisie) =>
    appeler<ReponseEcriture>(`/api/formations/${id(fid)}/structure`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(structure),
    }),

  sourceLecon: (fid: string, lid: string) =>
    appeler<ReponseSourceLecon>(`/api/formations/${id(fid)}/lecons/${id(lid)}/source`),

  enregistrerLecon: (fid: string, lid: string, markdown: string, jeton: string) =>
    appeler<ReponseEnregistrementSource>(
      `/api/formations/${id(fid)}/lecons/${id(lid)}/source`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown, jeton }),
      },
    ),

  apercu: (fid: string, markdown: string, signal?: AbortSignal) =>
    appeler<ReponseApercu>(`/api/formations/${id(fid)}/apercu`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown }),
      signal,
    }),

  importer: (nom: string, fichiers: FichierDepose[], ignorerManifeste = false) =>
    appeler<ReponseImport>("/api/formations/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nom, fichiers, ignorerManifeste }),
    }),

  archiver: (fid: string) =>
    appeler<{ id: string }>(`/api/formations/${id(fid)}/archiver`, { method: "POST" }),

  restaurerArchive: (fid: string) =>
    appeler<{ id: string }>(`/api/archives/${id(fid)}/restaurer`, { method: "POST" }),

  mettreEnCorbeille: (fid: string) =>
    appeler<ReponseCorbeilleAjout>(`/api/formations/${id(fid)}`, { method: "DELETE" }),

  mettreArchiveEnCorbeille: (fid: string) =>
    appeler<ReponseCorbeilleAjout>(`/api/archives/${id(fid)}`, { method: "DELETE" }),

  corbeille: () => appeler<ReponseCorbeille>("/api/corbeille"),

  restaurerDeCorbeille: (entree: string) =>
    appeler<{ id: string }>(`/api/corbeille/${id(entree)}/restaurer`, {
      method: "POST",
    }),

  nettoyer: (fid: string) =>
    appeler<ReponseSuppression>(`/api/progression/${id(fid)}/nettoyer`, {
      method: "POST",
    }),
};
