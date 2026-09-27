/** Startet den Download einer Textdatei (funktioniert in normalen Browsern). */
export function downloadText(name: string, text: string, type = 'text/plain'): void {
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
