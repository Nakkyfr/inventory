import { buildSlipPdfBlob } from "./pdfSlip";
import { buildWhatsappText, normalizePhone } from "./printSlip";

function slugify(value) {
  return String(value || "sale-slip")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "sale-slip";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareSlipAsPdf({ slip, items }) {
  const blob = buildSlipPdfBlob({ slip, items });
  const fileName = `${slugify(slip.slip_name)}.pdf`;
  const paymentStatus = slip.payment_status || "UNPAID";
  const caption = buildWhatsappText({ slip, items, paymentStatus });
  const phone = normalizePhone(slip.customer_phone);

  if (phone && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      // clipboard permission denied — not fatal, sharing still proceeds
    }
  }

  if (typeof File !== "undefined" && navigator.canShare) {
    const file = new File([blob], fileName, { type: "application/pdf" });

    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: slip.slip_name || "Sale Slip",
          text: decodeURIComponent(caption)
        });
        return { method: "share" };
      } catch (shareError) {
        if (shareError?.name === "AbortError") return { method: "cancelled" };
      }
    }
  }

  if (!phone) {
    throw new Error("This slip has no phone number to share to.");
  }

  downloadBlob(blob, fileName);
  window.open(`https://wa.me/${phone}?text=${caption}`, "_blank");

  return { method: "download" };
}
