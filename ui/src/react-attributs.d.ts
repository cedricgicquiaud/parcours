import "react";

/**
 * Sélection d'un dossier entier par le sélecteur de fichiers (G-R2) : ces deux
 * attributs sont supportés par tous les navigateurs mais absents du standard,
 * donc absents des types React.
 */
declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}
