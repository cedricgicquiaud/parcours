import { useEffect, useState } from "react";
import { api, ErreurApi, type StructureFormation } from "../api";
import { Bandeau, BlocErreur, Icone, Squelette } from "../composants/communs";
import type { Route } from "../routeur";

/** Une leçon en cours de saisie. `id` absent = leçon nouvelle. */
interface LeconSaisie {
  cle: number;
  id?: string;
  titre: string;
}

interface ModuleSaisie {
  cle: number;
  id?: string;
  titre: string;
  lecons: LeconSaisie[];
}

let compteurCles = 0;
const nouvelleCle = () => ++compteurCles;

/** Aperçu de l'identifiant dérivé — la version qui fait foi est côté serveur. */
export function apercuIdentifiant(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

function structureVide(): { titre: string; description: string; modules: ModuleSaisie[] } {
  return {
    titre: "",
    description: "",
    modules: [
      {
        cle: nouvelleCle(),
        titre: "",
        lecons: [{ cle: nouvelleCle(), titre: "" }],
      },
    ],
  };
}

export function Administration({
  fid,
  naviguer,
}: {
  /** `null` en création, identifiant de la formation en modification. */
  fid: string | null;
  naviguer: (route: Route) => void;
}) {
  const modeCreation = fid === null;
  const [titre, setTitre] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [identifiantTouche, setIdentifiantTouche] = useState(false);
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState<ModuleSaisie[]>(() => structureVide().modules);
  const [chargement, setChargement] = useState(!modeCreation);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (fid === null) return;
    setChargement(true);
    api
      .structure(fid)
      .then((structure: StructureFormation) => {
        setTitre(structure.titre);
        setIdentifiant(structure.id);
        setDescription(structure.description ?? "");
        setModules(
          structure.modules.map((module) => ({
            cle: nouvelleCle(),
            id: module.id,
            titre: module.titre,
            lecons: module.lecons.map((lecon) => ({
              cle: nouvelleCle(),
              id: lecon.id,
              titre: lecon.titre,
            })),
          })),
        );
        setErreurChargement(null);
      })
      .catch((cause: unknown) =>
        setErreurChargement(
          cause instanceof Error ? cause.message : "structure illisible",
        ),
      )
      .finally(() => setChargement(false));
  }, [fid]);

  const identifiantPropose =
    modeCreation && !identifiantTouche ? apercuIdentifiant(titre) : identifiant;

  function majModule(cle: number, transformation: (module: ModuleSaisie) => ModuleSaisie) {
    setModules((courants) =>
      courants.map((module) => (module.cle === cle ? transformation(module) : module)),
    );
  }

  function deplacer<T>(liste: T[], index: number, direction: -1 | 1): T[] {
    const cible = index + direction;
    if (cible < 0 || cible >= liste.length) return liste;
    const copie = [...liste];
    [copie[index], copie[cible]] = [copie[cible]!, copie[index]!];
    return copie;
  }

  async function envoyer(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const charge = {
      titre,
      description,
      modules: modules.map((module) => ({
        ...(module.id ? { id: module.id } : {}),
        titre: module.titre,
        lecons: module.lecons.map((lecon) => ({
          ...(lecon.id ? { id: lecon.id } : {}),
          titre: lecon.titre,
        })),
      })),
    };
    try {
      if (modeCreation) {
        const creee = await api.creerFormation({
          ...charge,
          id: identifiantPropose || undefined,
        });
        naviguer({ nom: "formation", fid: creee.id });
      } else {
        await api.enregistrerStructure(fid, charge);
        naviguer({ nom: "formation", fid });
      }
    } catch (cause: unknown) {
      setErreur(
        cause instanceof ErreurApi ? cause.message : "enregistrement impossible",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (erreurChargement) {
    return (
      <div className="page">
        <BlocErreur
          titre="Structure illisible"
          message={erreurChargement}
          action={
            <button
              type="button"
              className="bouton bouton-petit"
              onClick={() => naviguer({ nom: "catalogue" })}
            >
              Retour au catalogue
            </button>
          }
        />
      </div>
    );
  }

  if (chargement) {
    return (
      <div className="page">
        <Squelette largeur="45%" hauteur={26} />
        <Squelette largeur="70%" />
        <Squelette largeur="55%" />
      </div>
    );
  }

  return (
    <form className="page" onSubmit={envoyer}>
      <div className="titre-page">
        <h1>{modeCreation ? "Nouvelle formation" : "Modifier la structure"}</h1>
        <span className="meta-faible">
          {modeCreation
            ? "Le dossier et les fichiers sont créés pour vous."
            : "Titres, ordre, ajout et retrait de leçons."}
        </span>
      </div>

      <Bandeau icone="info">
        L'administration ne touche jamais au texte des leçons : elle crée les
        fichiers manquants et laisse les autres intacts. Retirer une leçon d'ici la
        sort du sommaire, son fichier reste sur le disque.
      </Bandeau>

      {erreur ? <Bandeau icone="warning">{erreur}</Bandeau> : null}

      <div className="champ">
        <label className="champ-etiquette" htmlFor="titre-formation">
          Titre de la formation
        </label>
        <input
          id="titre-formation"
          value={titre}
          onChange={(evenement) => setTitre(evenement.target.value)}
          placeholder="Formation pratique Claude"
          required
        />
      </div>

      {modeCreation ? (
        <div className="champ champ-mono">
          <label className="champ-etiquette" htmlFor="identifiant-formation">
            Identifiant (nom du dossier)
          </label>
          <input
            id="identifiant-formation"
            value={identifiantPropose}
            onChange={(evenement) => {
              setIdentifiantTouche(true);
              setIdentifiant(evenement.target.value);
            }}
            placeholder="formation-pratique-claude"
            pattern="[a-z0-9][a-z0-9-]*"
            maxLength={64}
          />
          <span className="champ-aide">
            Minuscules, chiffres et tirets. Dérivé du titre par défaut ; il ne
            changera plus ensuite.
          </span>
        </div>
      ) : (
        <div className="champ">
          <span className="champ-etiquette">Identifiant</span>
          <span className="identifiant-fige">{identifiant}</span>
        </div>
      )}

      <div className="champ">
        <label className="champ-etiquette" htmlFor="description-formation">
          Description
        </label>
        <textarea
          id="description-formation"
          value={description}
          onChange={(evenement) => setDescription(evenement.target.value)}
          placeholder="Deux phrases affichées sur la carte du catalogue."
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="kicker-faible">MODULES ET LEÇONS</span>

        {modules.map((module, indexModule) => (
          <section className="bloc-module" key={module.cle}>
            <div className="bloc-module-entete">
              <div className="champ">
                <label
                  className="champ-etiquette"
                  htmlFor={`module-${module.cle}`}
                >
                  Module {indexModule + 1}
                </label>
                <input
                  id={`module-${module.cle}`}
                  value={module.titre}
                  onChange={(evenement) =>
                    majModule(module.cle, (courant) => ({
                      ...courant,
                      titre: evenement.target.value,
                    }))
                  }
                  placeholder="Fondations"
                  required
                />
              </div>
              <button
                type="button"
                className="bouton-icone"
                aria-label={`Monter le module ${indexModule + 1}`}
                disabled={indexModule === 0}
                onClick={() => setModules((courants) => deplacer(courants, indexModule, -1))}
              >
                <Icone nom="arrow-up" taille={15} />
              </button>
              <button
                type="button"
                className="bouton-icone"
                aria-label={`Descendre le module ${indexModule + 1}`}
                disabled={indexModule === modules.length - 1}
                onClick={() => setModules((courants) => deplacer(courants, indexModule, 1))}
              >
                <Icone nom="arrow-down" taille={15} />
              </button>
              <button
                type="button"
                className="bouton-icone"
                aria-label={`Retirer le module ${indexModule + 1}`}
                disabled={modules.length === 1}
                onClick={() =>
                  setModules((courants) =>
                    courants.filter((courant) => courant.cle !== module.cle),
                  )
                }
              >
                <Icone nom="x" taille={15} />
              </button>
            </div>

            <div className="liste-lecons">
              {module.lecons.map((lecon, indexLecon) => (
                <div className="ligne-saisie" key={lecon.cle}>
                  <input
                    value={lecon.titre}
                    aria-label={`Leçon ${indexLecon + 1} du module ${indexModule + 1}`}
                    placeholder="Titre de la leçon"
                    required
                    onChange={(evenement) =>
                      majModule(module.cle, (courant) => ({
                        ...courant,
                        lecons: courant.lecons.map((courante) =>
                          courante.cle === lecon.cle
                            ? { ...courante, titre: evenement.target.value }
                            : courante,
                        ),
                      }))
                    }
                  />
                  {lecon.id ? (
                    <span className="identifiant-fige" title="Clé de progression">
                      {lecon.id}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="bouton-icone"
                    aria-label={`Monter la leçon ${indexLecon + 1}`}
                    disabled={indexLecon === 0}
                    onClick={() =>
                      majModule(module.cle, (courant) => ({
                        ...courant,
                        lecons: deplacer(courant.lecons, indexLecon, -1),
                      }))
                    }
                  >
                    <Icone nom="arrow-up" taille={14} />
                  </button>
                  <button
                    type="button"
                    className="bouton-icone"
                    aria-label={`Descendre la leçon ${indexLecon + 1}`}
                    disabled={indexLecon === module.lecons.length - 1}
                    onClick={() =>
                      majModule(module.cle, (courant) => ({
                        ...courant,
                        lecons: deplacer(courant.lecons, indexLecon, 1),
                      }))
                    }
                  >
                    <Icone nom="arrow-down" taille={14} />
                  </button>
                  <button
                    type="button"
                    className="bouton-icone"
                    aria-label={`Retirer la leçon ${indexLecon + 1}`}
                    disabled={module.lecons.length === 1}
                    onClick={() =>
                      majModule(module.cle, (courant) => ({
                        ...courant,
                        lecons: courant.lecons.filter(
                          (courante) => courante.cle !== lecon.cle,
                        ),
                      }))
                    }
                  >
                    <Icone nom="x" taille={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="bouton bouton-petit bouton-neutre"
                style={{ alignSelf: "flex-start" }}
                onClick={() =>
                  majModule(module.cle, (courant) => ({
                    ...courant,
                    lecons: [...courant.lecons, { cle: nouvelleCle(), titre: "" }],
                  }))
                }
              >
                Ajouter une leçon
              </button>
            </div>
          </section>
        ))}

        <button
          type="button"
          className="bouton bouton-petit bouton-neutre"
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            setModules((courants) => [
              ...courants,
              {
                cle: nouvelleCle(),
                titre: "",
                lecons: [{ cle: nouvelleCle(), titre: "" }],
              },
            ])
          }
        >
          Ajouter un module
        </button>
      </div>

      <div className="actions-formulaire">
        <button type="submit" className="bouton" disabled={envoi}>
          {envoi
            ? "Enregistrement…"
            : modeCreation
              ? "Créer la formation"
              : "Enregistrer"}
          <Icone nom="check" />
        </button>
        <button
          type="button"
          className="bouton bouton-neutre"
          onClick={() =>
            naviguer(fid ? { nom: "formation", fid } : { nom: "catalogue" })
          }
        >
          Annuler
        </button>
      </div>

    </form>
  );
}
