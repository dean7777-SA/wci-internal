import jsPDF from "jspdf";

let cachedLogo: string | null = null;

async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch("/wci-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        cachedLogo = reader.result as string;
        resolve(cachedLogo);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Logo aspect ratio: 2334 × 908 ≈ 2.57:1
const LOGO_RATIO = 2334 / 908;

/**
 * Add the WCI logo to the PDF at the given position.
 * Returns the width used (so callers can position text after it),
 * or 0 if the logo couldn't be loaded (caller should fall back to text).
 */
export async function addPdfLogo(
  pdf: jsPDF,
  x: number,
  y: number,
  height: number,
): Promise<number> {
  const dataUrl = await loadLogoDataUrl();
  if (!dataUrl) return 0;
  const w = height * LOGO_RATIO;
  pdf.addImage(dataUrl, "PNG", x, y, w, height);
  return w;
}
