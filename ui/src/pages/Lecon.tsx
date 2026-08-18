import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReponseLecon } from "../api";
import {
  Bandeau,
  BlocErreur,
  Icone,
  Squelette,
} from "../composants/communs";
import { cheminDe, estClicSimple, type Route } from "../routeur";

export function PageLecon({
  lecon,
  chargement,
  erreur,
  erreurCoche,
  naviguer,
  surBasculerFaite,
  surBasculerCritere,
  peutEcrire = false,
}: {
  lecon: ReponseLecon | null;
  chargement: boolean;
  erreur: string | null;
  erreurCoche: string | null;
  naviguer: (route: Route) => void;
  surBasculerFaite: () => void;
  /** Bascule un critère ; `false` = le serveur a refusé, on revient en arrière. */
  surBasculerCritere: (id: string, coche: boolean) => Promise<boolean>;
  /** Administrateur avec l'édition allumée (ED-R7) : la leçon devient éditable. */
  peutEcrire?: boolean;
}) {
  const contenu = useRef<HTMLDivElement>(null);
  const criteresServeur = lecon?.criteres;
  /**
   * États des critères, tenus à part du HTML : le DOM sert d'affichage (le
   * serveur l'a déjà rendu coché), cet état sert au décompte (CR-R9).
   */
  const [criteres, setCriteres] = useState<Record<string, boolean>>({});
  const [avertissement, setAvertissement] = useState(false);

  useEffect(() => {
    setCriteres(
      Object.fromEntries((criteresServeur ?? []).map(({ id, coche }) => [id, coche])),
    );
    setAvertissement(false);
  }, [criteresServeur]);

  /**
   * L'objet passé à `dangerouslySetInnerHTML` DOIT être stable : React compare
   * la référence, pas la chaîne. Sans ce mémo, le moindre rendu réécrivait tout
   * le contenu de la leçon — et une case qu'on venait de cocher se vidait
   * aussitôt, puisque le HTML servi décrit l'état d'avant le clic.
   */
  const contenuHtml = useMemo(() => ({ __html: lecon?.html ?? "" }), [lecon?.html]);

  const total = criteresServeur?.length ?? 0;
  const faits = useMemo(
    () => Object.values(criteres).filter(Boolean).length,
    [criteres],
  );

  /**
   * Délégation sur un écouteur NATIF : les cases viennent du HTML du serveur,
   * pas du JSX — React ne voit pas leurs événements. Un seul écouteur suffit,
   * et il survit au remplacement du contenu.
   */
  const basculer = useCallback(
    (cible: HTMLInputElement) => {
      const id = cible.dataset.critere;
      if (!id) return;
      const coche = cible.checked;
      setCriteres((etats) => ({ ...etats, [id]: coche }));
      void surBasculerCritere(id, coche).then((accepte) => {
        if (accepte) return;
        // CR-R6 : le serveur a refusé — la case ment, on la remet.
        cible.checked = !coche;
        setCriteres((etats) => ({ ...etats, [id]: !coche }));
      });
    },
    [surBasculerCritere],
  );

  useEffect(() => {
    const noeud = contenu.current;
    if (!noeud) return;
    const surChangement = (evenement: Event) => {
      const cible = evenement.target as HTMLInputElement | null;
      if (cible?.type === "checkbox" && cible.dataset.critere) basculer(cible);
    };
    noeud.addEventListener("change", surChangement);
    return () => noeud.removeEventListener("change", surChangement);
  }, [basculer, lecon]);

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
          {peutEcrire ? (
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
          ) : null}
        </div>

        <h1>{lecon.titre}</h1>

        <div className="lecon-criteres" aria-live="polite">
          {total > 0 ? (
            <>
              <span className="barre">
                <span
                  className="barre-remplie"
                  style={{ width: `${total === 0 ? 0 : Math.round((faits / total) * 100)}%` }}
                />
              </span>
              <span className="meta-faible">
                {faits}/{total} critères
              </span>
            </>
          ) : null}
          {lecon.criteresTronques ? (
            <span className="meta-faible">
              au-delà de 300 critères, les suivants ne sont pas suivis
            </span>
          ) : null}
        </div>

        {lecon.suppose?.length ? (
          <Bandeau icone="warning">
            Cette leçon suppose que vous ayez terminé{" "}
            {lecon.suppose.map((supposee, index, liste) => (
              <Fragment key={supposee.id}>
                {index === 0 ? "" : index === liste.length - 1 ? " et " : ", "}
                <a
                  href={cheminDe({
                    nom: "lecon",
                    fid: lecon.formationId,
                    lid: supposee.id,
                  })}
                  onClick={(evenement) => {
                    if (!estClicSimple(evenement)) return;
                    evenement.preventDefault();
                    naviguer({
                      nom: "lecon",
                      fid: lecon.formationId,
                      lid: supposee.id,
                    });
                  }}
                >
                  {supposee.titre}
                </a>
              </Fragment>
            ))}
            .
          </Bandeau>
        ) : null}

        {erreurCoche ? <Bandeau icone="warning">{erreurCoche}</Bandeau> : null}
        {avertissement ? (
          <Bandeau icone="warning">
            {total - faits} critère{total - faits > 1 ? "s restent" : " reste"} ouvert
            {total - faits > 1 ? "s" : ""} — la leçon est marquée terminée quand même.
          </Bandeau>
        ) : null}

        <div
          className="contenu-lecon"
          ref={contenu}
          // HTML déjà assaini par le serveur (A-R5, F-R6).
          dangerouslySetInnerHTML={contenuHtml}
        />

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
            onClick={() => {
              // CR-R11 : on avertit, on ne bloque pas — l'apprenant reste juge.
              setAvertissement(!lecon.faite && faits < total);
              surBasculerFaite();
            }}
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
