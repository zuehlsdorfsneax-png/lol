/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" im Build für die Veröffentlichung als Artefakt (keine Datei-Downloads möglich). */
  readonly VITE_ARTIFACT?: string;
}
