import { useCallback, useEffect, useRef, useState } from "react";
import { api, ErreurApi, type ReponseSourceLecon } from "../api";
import { Bandeau, BlocErreur, Icone, Squelette } from "../composants/communs";
import type { Route } from "../routeur";

/** Anti-rebond de l'aperçu, en millisecondes. */
export const DELAI_APERCU = 300;

export function EditeurLecon({
  fid,
  lid,
  naviguer,
}: {
  fid: string;
  lid: string;
  naviguer: (route: Route) => void;
}) {
  const [source, setSource] = useState<ReponseSourceLecon | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [jeton, setJeton] = useState("");
  const [apercu, setApercu] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [conflit, setConflit] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [enregistre, setEnregistre] = useState(false);
  const compteurApercu = useRef(0);

  const modifie = source !== null && markdown !== source.markdown;

  useEffect(() => {
    setChargement(true);
    api
      .sourceLecon(fid, lid)
      .then((resultat) => {
        setSource(resultat);
        setMarkdown(resultat.markdown);
        setJeton(resultat.jeton);
        setErreurChargement(null);
      })
      .catch((cause: unknown) =>
        setErreurChargement(cause instanceof Error ? cause.message : "leçon illisible"),
      )
      .finally(() => setChargement(false));
  }, [fid, lid]);

  // Aperçu rendu par le serveur (A-R5), anti-rebondi comme la recherche.
  useEffect(() => {
    if (source === null) return;
    const rang = ++compteurApercu.current;
    const minuteur = window.setTimeout(() => {
      api
        .apercu(fid, markdown)
        .then((resultat) => {
          if (rang === compteurApercu.current) setApercu(resultat.html);
        })
        .catch(() => undefined);
    }, DELAI_APERCU);
    return () => window.clearTimeout(minuteur);
  }, [fid, markdown, source]);

  // Rien ne part sans geste explicite : on prévient avant de perdre la saisie.
  useEffect(() => {
    if (!modifie) return;
    const avertir = (evenement: BeforeUnloadEvent) => evenement.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifie]);

  const enregistrer = useCallback(async () => {
    setErreur(null);
    setConflit(false);
    setEnregistrement(true);
    try {
      const resultat = await api.enregistrerLecon(fid, lid, markdown, jeton);
      setJeton(resultat.jeton);
      setSource((courante) => (courante ? { ...courante, markdown } : courante));
      setEnregistre(true);
      window.setTimeout(() => setEnregistre(false), 2500);
    } catch (cause: unknown) {
      if (cause instanceof ErreurApi && cause.statut === 409) setConflit(true);
      setErreur(
        cause instanceof Error ? cause.message : "enregistrement impossible",
      );
    } finally {
      setEnregistrement(false);
    }
  }, [fid, lid, markdown, jeton]);

  function quitter() {
    if (modifie && !window.confirm("Quitter sans enregistrer les modifications ?")) {
      return;
    }
    naviguer({ nom: "lecon", fid, lid });
  }

  async function rechargerDepuisLeDisque() {
    const resultat = await api.sourceLecon(fid, lid);
    setSource(resultat);
    setMarkdown(resultat.markdown);
    setJeton(resultat.jeton);
    setConflit(false);
    setErreur(null);
  }

  // Cmd/Ctrl + S enregistre, comme dans un éditeur.
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if ((evenement.metaKey || evenement.ctrlKey) && evenement.key === "s") {
        evenement.preventDefault();
        void enregistrer();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [enregistrer]);

  if (erreurChargement) {
    return (
      <div className="page">
        <BlocErreur
          titre="Leçon illisible"
          message={erreurChargement}
          action={
            <button
              type="button"
              className="bouton bouton-petit"
              onClick={() => naviguer({ nom: "formation", fid })}
            >
              Retour au sommaire
            </button>
          }
        />
      </div>
    );
  }

  if (chargement || !source) {
    return (
      <div className="page">
        <Squelette largeur="40%" hauteur={22} />
        <Squelette />
        <Squelette largeur="90%" />
      </div>
    );
  }

  return (
    <div className="editeur">
      <div className="editeur-barre">
        <div className="editeur-titre">
          <span className="kicker-faible">MODIFICATION</span>
          <strong>{source.titre}</strong>
          <code className="identifiant-fige">{source.fichier}</code>
        </div>
        <div className="editeur-actions">
          <span className="meta-faible" aria-live="polite">
            {enregistrement
              ? "Enregistrement…"
              : enregistre
                ? "Enregistré"
                : modifie
                  ? "Modifications non enregistrées"
                  : ""}
          </span>
          <button type="button" className="bouton bouton-petit bouton-neutre" onClick={quitter}>
            Fermer
          </button>
          <button
            type="button"
            className="bouton bouton-petit"
            onClick={() => void enregistrer()}
            disabled={enregistrement || !modifie}
          >
            <Icone nom="check" taille={14} />
            Enregistrer
          </button>
        </div>
      </div>

      {erreur ? (
        <div style={{ padding: "0 24px" }}>
          <Bandeau
            icone="warning"
            actions={
              conflit ? (
                <button
                  type="button"
                  className="bouton bouton-petit"
                  onClick={() => void rechargerDepuisLeDisque()}
                >
                  Recharger le fichier
                </button>
              ) : undefined
            }
          >
            {erreur}
          </Bandeau>
        </div>
      ) : null}

      <div className="editeur-colonnes">
        <div className="editeur-colonne">
          <label className="champ-etiquette" htmlFor="source-lecon">
            Markdown
          </label>
          <textarea
            id="source-lecon"
            className="editeur-saisie"
            value={markdown}
            spellCheck
            onChange={(evenement) => setMarkdown(evenement.target.value)}
          />
          <span className="champ-aide">
            Blocs disponibles : <code>:::astuce</code>, <code>:::attention</code>,{" "}
            <code>:::indice</code>, <code>:::solution</code>,{" "}
            <code>:::prerequis</code>. Lien interne :{" "}
            <code>[texte](lecon:identifiant)</code>.
          </span>
        </div>

        <div className="editeur-colonne">
          <span className="champ-etiquette">Aperçu</span>
          <div
            className="contenu-lecon editeur-apercu"
            // HTML rendu et assaini par le serveur, comme la leçon elle-même.
            dangerouslySetInnerHTML={{ __html: apercu }}
          />
        </div>
      </div>
    </div>
  );
}
