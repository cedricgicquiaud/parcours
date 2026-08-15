import { useEffect, useRef } from "react";
import type { ReponseLecon } from "../api";
import {
  Bandeau,
  BlocErreur,
  Icone,
  PiedPlateforme,
  Squelette,
} from "../composants/communs";
import { estClicSimple, type Route } from "../routeur";

export function PageLecon({
  lecon,
  chargement,
  erreur,
  erreurCoche,
  naviguer,
  surBasculerFaite,
}: {
  lecon: ReponseLecon | null;
  chargement: boolean;
  erreur: string | null;
  erreurCoche: string | null;
  naviguer: (route: Route) => void;
  surBasculerFaite: () => void;
}) {
  const contenu = useRef<HTMLDivElement>(null);

  // Les liens `lecon:` rendus par le serveur restent en navigation client (F-R12).
  useEffect(() => {
    const noeud = contenu.current;
    if (!noeud) return;
    const surClic = (evenement: MouseEvent) => {
      const lien = (evenement.target as HTMLElement | null)?.closest("a");
      const cible = lien?.getAttribute("data-lecon");
      if (!lien || !cible || !estClicSimple(evenement as unknown as React.MouseEvent)) {
        return;
      }
      evenement.preventDefault();
      naviguer({ nom: "lecon", fid: lecon!.formationId, lid: cible });
    };
    noeud.addEventListener("click", surClic);
    return () => noeud.removeEventListener("click", surClic);
  }, [lecon, naviguer]);

  // F-R10 : mermaid est chargé à la demande, uniquement si la leçon en contient.
  useEffect(() => {
    const noeud = contenu.current;
    if (!noeud) return;
    const schemas = [...noeud.querySelectorAll<HTMLElement>(".mermaid-source")];
    if (schemas.length === 0) return;
    let annule = false;

    void (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        if (annule) return;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        for (const [index, schema] of schemas.entries()) {
          const source = schema.dataset.source ?? "";
          try {
            const { svg } = await mermaid.render(`schema-${index}`, source);
            if (annule) return;
            schema.innerHTML = svg;
          } catch {
            schema.insertAdjacentHTML(
              "afterbegin",
              '<p class="meta-faible">Schéma non rendu (syntaxe invalide).</p>',
            );
          }
        }
      } catch {
        // Lib indisponible : le source reste affiché en bloc de code.
      }
    })();

    return () => {
      annule = true;
    };
  }, [lecon]);

  if (erreur) {
    return (
      <div className="page page-lecon">
        <BlocErreur
          titre="Leçon indisponible"
          message={erreur}
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
        <PiedPlateforme />
      </div>
    );
  }

  if (!lecon || chargement) {
    return (
      <div className="page page-lecon">
        <Squelette largeur="35%" hauteur={14} />
        <Squelette largeur="60%" hauteur={28} />
        <Squelette />
        <Squelette largeur="96%" />
        <Squelette largeur="70%" />
        <PiedPlateforme />
      </div>
    );
  }

  return (
    <>
      <article className="page page-lecon lecon">
        <div className="lecon-entete">
          <nav className="fil-ariane" aria-label="Fil d'Ariane">
          <a
            href={`/formation/${encodeURIComponent(lecon.formationId)}`}
            onClick={(evenement) => {
              evenement.preventDefault();
              naviguer({ nom: "formation", fid: lecon.formationId });
            }}
          >
            {lecon.formationTitre}
          </a>
          <span>/</span>
          <span style={{ textTransform: "uppercase" }}>{lecon.moduleTitre}</span>
          <span>·</span>
            <span style={{ textTransform: "uppercase" }}>
              Leçon {lecon.position} sur {lecon.total}
            </span>
          </nav>
          <button
            type="button"
            className="bouton bouton-petit bouton-neutre"
            onClick={() =>
              naviguer({ nom: "editer", fid: lecon.formationId, lid: lecon.leconId })
            }
          >
            <Icone nom="pencil-simple" taille={14} />
            Modifier cette leçon
          </button>
        </div>

        <h1>{lecon.titre}</h1>

        {erreurCoche ? <Bandeau icone="warning">{erreurCoche}</Bandeau> : null}

        <div
          className="contenu-lecon"
          ref={contenu}
          // HTML déjà assaini par le serveur (A-R5, F-R6).
          dangerouslySetInnerHTML={{ __html: lecon.html }}
        />

        <PiedPlateforme />
      </article>

      <div className="barre-actions">
        <div className="barre-actions-contenu">
          {lecon.precedente ? (
            <button
              type="button"
              className="bouton-voisin"
              onClick={() =>
                naviguer({
                  nom: "lecon",
                  fid: lecon.formationId,
                  lid: lecon.precedente!.id,
                })
              }
            >
              <Icone nom="arrow-left" />
              <span>{lecon.precedente.titre}</span>
            </button>
          ) : null}

          <button
            type="button"
            className={`bouton bouton-terminer${lecon.faite ? " bouton-actif" : ""}`}
            aria-pressed={lecon.faite}
            onClick={surBasculerFaite}
          >
            <Icone nom={lecon.faite ? "check-circle" : "check"} taille={16} />
            {lecon.faite ? "Terminé" : "Marquer comme terminé"}
          </button>

          <button
            type="button"
            className="bouton-voisin"
            onClick={() =>
              lecon.suivante
                ? naviguer({
                    nom: "lecon",
                    fid: lecon.formationId,
                    lid: lecon.suivante.id,
                  })
                : // Depuis la dernière leçon, « suivante » ramène au sommaire (U-R3).
                  naviguer({ nom: "formation", fid: lecon.formationId })
            }
          >
            <span>{lecon.suivante ? lecon.suivante.titre : "Retour au sommaire"}</span>
            <Icone nom="arrow-right" />
          </button>
        </div>
      </div>
    </>
  );
}
