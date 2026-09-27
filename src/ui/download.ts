/**
 * Export von Daten. In normalen Browsern als Datei-Download; in eingebetteten Umgebungen, die
 * Downloads sperren (Build-Modus "artifact"), wird Text stattdessen in die Zwischenablage kopiert.
 */
export const FILE_EXPORT = import.meta.env.VITE_ARTIFACT !== '1';

/** Exportiert Text als Datei bzw. kopiert ihn in die Zwischenablage. */
export function downloadText(name: string, text: string, type = 'text/plain'): void {
  if (!FILE_EXPORT) {
    navigator.clipboard.writeText(text).then(
      () => showToast('Daten in die Zwischenablage kopiert – z. B. in Excel einfügen.'),
      () => showToast('Kopieren wurde vom Browser verhindert.'),
    );
    return;
  }
  // BOM, damit Excel Umlaute korrekt erkennt.
  const blob = new Blob(['﻿', text], { type: `${type};charset=utf-8` });
  trigger(name, URL.createObjectURL(blob));
}

export function downloadCanvas(canvas: HTMLCanvasElement, name: string): void {
  canvas.toBlob((blob) => {
    if (blob) trigger(name, URL.createObjectURL(blob));
  }, 'image/png');
}

function trigger(name: string, url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Kurze Rückmeldung am unteren Bildschirmrand. */
export function showToast(message: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
