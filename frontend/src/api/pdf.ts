import client, { API_BASE_URL } from "./client";

/**
 * Generates a fresh PDF server-side, then triggers a real file download via
 * a short-lived signed-token URL (rather than fetching it as a blob) —
 * some embedded/sandboxed browser previews block navigation to blob: URLs
 * entirely, so a normal http(s) URL is the more broadly compatible choice.
 * The token substitutes for the Authorization header, which a plain link
 * navigation can't attach.
 *
 * This uses a hidden <a download> click rather than window.open: the
 * server responds with Content-Disposition: attachment, so there's no page
 * to show in a new tab anyway — window.open would just open a blank tab
 * that immediately closes once the download starts. A same-page anchor
 * click downloads the file without opening (or "popup-blocking") anything.
 */
export async function openGeneratedPdf(
  kind: "quotes" | "invoices",
  id: number
): Promise<void> {
  const res = await client.post<{ pdf_url: string }>(`/api/${kind}/${id}/generate-pdf`);
  const link = document.createElement("a");
  link.href = `${API_BASE_URL}${res.data.pdf_url}`;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
