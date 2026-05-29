import jsPDF from "jspdf";
import type { ContactSubmission, EstimateRequest } from "@/hooks/useSales";
import { addPdfLogo } from "@/lib/pdfLogo";

async function loadImageAsDataUrl(src: string, maxWidth = 800): Promise<string | null> {
  try {
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${maxWidth}&output=jpeg&q=80`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ─── Helpers ─── */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

const textDark = { r: 30, g: 30, b: 30 };
const textMid = { r: 120, g: 120, b: 120 };
const textLight = { r: 160, g: 160, b: 160 };
const lineColor = { r: 230, g: 230, b: 230 };

function addRow(pdf: jsPDF, label: string, value: string | null | undefined, x: number, y: number, maxW: number): number {
  if (!value) return y;
  pdf.setFontSize(7);
  pdf.setTextColor(textMid.r, textMid.g, textMid.b);
  pdf.text(`${label}:`, x, y);
  pdf.setFontSize(8);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  const lines = pdf.splitTextToSize(value, maxW - 30);
  pdf.text(lines.slice(0, 4), x + 28, y);
  return y + Math.max(lines.slice(0, 4).length, 1) * 4 + 1.5;
}

async function addFooter(pdf: jsPDF, pw: number, ph: number, margin: number) {
  const footerY = ph - 14;
  pdf.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
  pdf.setLineWidth(0.2);
  pdf.line(margin, footerY - 4, pw - margin, footerY - 4);
  const logoH = 4;
  const logoW = await addPdfLogo(pdf, margin, footerY - logoH + 0.5, logoH);
  if (logoW) {
    pdf.setFontSize(7);
    pdf.setTextColor(textLight.r, textLight.g, textLight.b);
    pdf.text("wallcoverings.co.za  ·  Premium Wallcoverings", margin + logoW + 3, footerY);
  } else {
    pdf.setFontSize(8);
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.text("WCI", margin, footerY);
    pdf.setFontSize(7);
    pdf.setTextColor(textLight.r, textLight.g, textLight.b);
    pdf.text("wallcoverings.co.za  ·  Premium Wallcoverings", margin + 12, footerY);
  }
  const exportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  pdf.text(`Exported ${exportDate}`, pw - margin, footerY, { align: "right" });
}

/* ═══════════════════════════════════════════════
   CONTACT ENQUIRY PDF
   ═══════════════════════════════════════════════ */
export async function exportContactPdf(c: ContactSubmission) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const ph = 297;
  const margin = 20;
  const contentW = pw - margin * 2;

  // Header
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(textLight.r, textLight.g, textLight.b);
  pdf.text("SALES ENQUIRY", margin, margin + 6);

  pdf.setFontSize(22);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  pdf.text(`${c.name} ${c.surname}`, margin, margin + 16);

  if (c.company) {
    pdf.setFontSize(10);
    pdf.setTextColor(textMid.r, textMid.g, textMid.b);
    pdf.text(c.company, margin, margin + 22);
  }

  pdf.setFontSize(7);
  pdf.setTextColor(textLight.r, textLight.g, textLight.b);
  pdf.text(`${fmtDate(c.created_at)} at ${fmtTime(c.created_at)}`, pw - margin, margin + 6, { align: "right" });

  // Status & assignment
  let y = margin + 30;
  pdf.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pw - margin, y);
  y += 6;

  y = addRow(pdf, "Form type", c.form_type, margin, y, contentW);
  y = addRow(pdf, "Status", c.status, margin, y, contentW);
  y = addRow(pdf, "Assigned to", c.assigned_to, margin, y, contentW);

  // Contact details
  y += 4;
  pdf.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
  pdf.line(margin, y, pw - margin, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  pdf.text("Contact Details", margin, y);
  y += 6;

  y = addRow(pdf, "Email", c.email, margin, y, contentW);
  y = addRow(pdf, "Phone", c.phone ? `${c.dialing_code || ""} ${c.phone}` : null, margin, y, contentW);
  y = addRow(pdf, "Location", c.location, margin, y, contentW);
  y = addRow(pdf, "Country", c.country, margin, y, contentW);
  y = addRow(pdf, "Company", c.company, margin, y, contentW);
  y = addRow(pdf, "Role", c.role, margin, y, contentW);

  // Project details
  y += 4;
  pdf.line(margin, y, pw - margin, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  pdf.text("Project Details", margin, y);
  y += 6;

  y = addRow(pdf, "Project name", c.project_name, margin, y, contentW);
  y = addRow(pdf, "Project type", c.project_type, margin, y, contentW);
  y = addRow(pdf, "Stage", c.project_stage, margin, y, contentW);
  y = addRow(pdf, "Quantity", c.quantity_estimate, margin, y, contentW);
  y = addRow(pdf, "Trade assist", c.trade_assist, margin, y, contentW);
  y = addRow(pdf, "Bespoke type", c.bespoke_type, margin, y, contentW);

  // Message
  if (c.message) {
    y += 4;
    pdf.line(margin, y, pw - margin, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.text("Message", margin, y);
    y += 6;
    pdf.setFontSize(8);
    pdf.setTextColor(textMid.r, textMid.g, textMid.b);
    const msgLines = pdf.splitTextToSize(c.message, contentW);
    pdf.text(msgLines.slice(0, 20), margin, y);
  }

  await addFooter(pdf, pw, ph, margin);

  const filename = `${c.form_type}-enquiry-${c.name}-${c.surname}`.toLowerCase().replace(/\s+/g, "-") + ".pdf";
  pdf.save(filename);
}

/* ═══════════════════════════════════════════════
   ESTIMATE REQUEST PDF
   ═══════════════════════════════════════════════ */
export async function exportEstimatePdf(e: EstimateRequest) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const ph = 297;
  const margin = 20;
  const contentW = pw - margin * 2;

  // Header
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(textLight.r, textLight.g, textLight.b);
  pdf.text("ESTIMATE REQUEST", margin, margin + 6);

  pdf.setFontSize(22);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  pdf.text(e.full_name, margin, margin + 16);

  if (e.company_name) {
    pdf.setFontSize(10);
    pdf.setTextColor(textMid.r, textMid.g, textMid.b);
    pdf.text(e.company_name, margin, margin + 22);
  }

  pdf.setFontSize(7);
  pdf.setTextColor(textLight.r, textLight.g, textLight.b);
  pdf.text(`${fmtDate(e.created_at)} at ${fmtTime(e.created_at)}`, pw - margin, margin + 6, { align: "right" });

  // Status & assignment
  let y = margin + 30;
  pdf.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pw - margin, y);
  y += 6;

  y = addRow(pdf, "Request type", e.request_type, margin, y, contentW);
  y = addRow(pdf, "Status", e.status, margin, y, contentW);
  y = addRow(pdf, "Assigned to", e.assigned_to, margin, y, contentW);

  // Client details
  y += 4;
  pdf.line(margin, y, pw - margin, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  pdf.text("Client Details", margin, y);
  y += 6;

  y = addRow(pdf, "Email", e.email, margin, y, contentW);
  y = addRow(pdf, "Phone", e.phone, margin, y, contentW);
  y = addRow(pdf, "Company", e.company_name, margin, y, contentW);
  y = addRow(pdf, "Role", e.professional_role, margin, y, contentW);

  // Project details
  y += 4;
  pdf.line(margin, y, pw - margin, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(textDark.r, textDark.g, textDark.b);
  pdf.text("Project Details", margin, y);
  y += 6;

  y = addRow(pdf, "Project", e.project_name, margin, y, contentW);
  y = addRow(pdf, "Location", e.project_location, margin, y, contentW);
  y = addRow(pdf, "Stage", e.project_stage, margin, y, contentW);

  // Notes
  if (e.project_notes) {
    y += 4;
    pdf.line(margin, y, pw - margin, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.text("Notes", margin, y);
    y += 6;
    pdf.setFontSize(8);
    pdf.setTextColor(textMid.r, textMid.g, textMid.b);
    const noteLines = pdf.splitTextToSize(e.project_notes, contentW);
    pdf.text(noteLines.slice(0, 10), margin, y);
    y += noteLines.slice(0, 10).length * 4 + 2;
  }

  // Wall dimensions
  if (e.wall_dimensions && e.wall_dimensions.length > 0) {
    y += 4;
    pdf.line(margin, y, pw - margin, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.text("Wall Dimensions", margin, y);
    y += 6;

    for (const w of e.wall_dimensions) {
      pdf.setFontSize(8);
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);
      const label = w.name || "Wall";
      pdf.text(`${label}: ${w.width}cm × ${w.height}cm${w.notes ? ` — ${w.notes}` : ""}`, margin, y);
      y += 5;
    }
  }

  // Selected designs with images
  const designs = e.selected_designs ?? [];
  if (designs.length > 0) {
    pdf.addPage();

    pdf.setFontSize(8);
    pdf.setTextColor(textLight.r, textLight.g, textLight.b);
    pdf.text("ESTIMATE REQUEST", margin, margin + 6);
    pdf.text(`${e.full_name}`, pw - margin, margin + 6, { align: "right" });

    pdf.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
    pdf.setLineWidth(0.2);
    pdf.line(margin, margin + 10, pw - margin, margin + 10);

    pdf.setFontSize(9);
    pdf.setTextColor(textDark.r, textDark.g, textDark.b);
    pdf.text(`Selected Designs (${designs.length})`, margin, margin + 18);

    const cols = 3;
    const cellW = (contentW - (cols - 1) * 6) / cols;
    const imgH = cellW * 1.2;
    const cellH = imgH + 22;
    let cx = margin;
    let cy = margin + 24;

    for (let i = 0; i < designs.length; i++) {
      const d = designs[i];

      if (cy + cellH > ph - 20) {
        pdf.addPage();
        cy = margin + 10;
      }

      if (d.product_image) {
        const dataUrl = await loadImageAsDataUrl(d.product_image);
        if (dataUrl) {
          try {
            pdf.addImage(dataUrl, "JPEG", cx, cy, cellW, imgH, undefined, "FAST");
          } catch {
            pdf.setFillColor(245, 245, 242);
            pdf.rect(cx, cy, cellW, imgH, "F");
          }
        } else {
          pdf.setFillColor(245, 245, 242);
          pdf.rect(cx, cy, cellW, imgH, "F");
        }
      } else {
        pdf.setFillColor(245, 245, 242);
        pdf.rect(cx, cy, cellW, imgH, "F");
      }

      const ty = cy + imgH + 3;
      pdf.setFontSize(7);
      pdf.setTextColor(textDark.r, textDark.g, textDark.b);
      const name = d.product_category || d.product_name;
      pdf.text(pdf.splitTextToSize(name, cellW).slice(0, 1).join(""), cx, ty);
      if (d.product_colour) {
        pdf.setFontSize(6);
        pdf.setTextColor(textMid.r, textMid.g, textMid.b);
        pdf.text(d.product_colour, cx, ty + 4);
      }
      if (d.product_sku) {
        pdf.setFontSize(6);
        pdf.setTextColor(textLight.r, textLight.g, textLight.b);
        pdf.text(d.product_sku, cx, ty + 8);
      }
      if (d.sample_requested) {
        pdf.setFontSize(5.5);
        pdf.setTextColor(180, 120, 30);
        pdf.text("SAMPLE REQUESTED", cx, ty + 12);
      }

      cx += cellW + 6;
      if ((i + 1) % cols === 0) {
        cx = margin;
        cy += cellH;
      }
    }
  }

  await addFooter(pdf, pw, ph, margin);

  const filename = `estimate-${e.full_name}`.toLowerCase().replace(/\s+/g, "-") + ".pdf";
  pdf.save(filename);
}
