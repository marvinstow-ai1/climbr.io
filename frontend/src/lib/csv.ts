// Tiny client-side CSV helper. RFC-4180-ish — quotes only when needed, doubles
// internal quotes, never trusts user content. UTF-8 BOM is prepended so Excel
// opens umlauts correctly.

export function csvCell(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
