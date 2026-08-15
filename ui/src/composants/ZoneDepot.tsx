import { useCallback, useId, useRef, useState } from "react";
import {
  entreesDeSelection,
  entreesDuTransfert,
  type EntreeDepot,
} from "../depot";
import { Icone } from "./communs";

/**
 * Zone d'import d'une formation (G-R2) : glisser-déposer d'un dossier, ou
 * sélection par le sélecteur de fichiers du système. Les deux chemins
 * produisent les mêmes entrées.
 */
export function ZoneDepot({
  surDepot,
  occupe,
  compacte = false,
}: {
  surDepot: (entrees: EntreeDepot[]) => void;
  occupe: boolean;
  compacte?: boolean;
}) {
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const identifiant = useId();

  const deposer = useCallback(
    async (evenement: React.DragEvent) => {
      evenement.preventDefault();
      setSurvol(false);
      if (occupe) return;
      const entrees = await entreesDuTransfert(evenement.dataTransfer);
      if (entrees.length > 0) surDepot(entrees);
    },
    [occupe, surDepot],
  );

  return (
    <div
      className={`zone-depot${survol ? " zone-depot-active" : ""}${compacte ? " zone-depot-compacte" : ""}`}
      onDragOver={(evenement) => {
        evenement.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(evenement) => void deposer(evenement)}
    >
      <Icone nom={occupe ? "hourglass" : "folder-plus"} taille={compacte ? 18 : 22} />
      <span className="zone-depot-titre">
        {occupe ? "Import en cours…" : "Déposez un dossier de formation"}
      </span>
      {!compacte ? (
        <span className="zone-depot-aide">
          Markdown et fichiers joints. Sans <code>formation.json</code>, Parcours
          construit le sommaire à partir des fichiers.
        </span>
      ) : null}
      <label className="bouton bouton-petit bouton-neutre" htmlFor={identifiant}>
        <Icone nom="upload-simple" taille={14} />
        Choisir un dossier
      </label>
      <input
        id={identifiant}
        ref={champ}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        className="champ-fichier"
        disabled={occupe}
        onChange={(evenement) => {
          const fichiers = evenement.target.files;
          if (fichiers && fichiers.length > 0) {
            surDepot(entreesDeSelection(fichiers));
          }
          // Redéposer le même dossier doit relancer un import.
          if (champ.current) champ.current.value = "";
        }}
      />
    </div>
  );
}
