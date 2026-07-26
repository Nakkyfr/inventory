import { jsPDF } from "jspdf";
import { COMPANY_DETAILS, PAYMENT_MODES, PAYMENT_STATUSES } from "./appConfig";
import { formatCurrency, formatDateTime, formatNumber } from "./format";

const PAGE_WIDTH = 105;
const PAGE_HEIGHT = 148;
const MARGIN = 6;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLS = [
  { label: "#", width: 6, align: "left" },
  { label: "Item", width: 39, align: "left" },
  { label: "Qty", width: 12, align: "right" },
  { label: "Rate", width: 16, align: "right" },
  { label: "Amount", width: 20, align: "right" }
];

function columnX(index) {
  let x = MARGIN;
  for (let i = 0; i < index; i += 1) x += COLS[i].width;
  return x;
}

function drawText(doc, text, x, y, { align = "left", width } = {}) {
  const cellX = align === "right" ? x + width : x;
  doc.text(String(text ?? ""), cellX, y, { align });
}

function drawRow(doc, values, y, { bold = false, color = [15, 23, 42] } = {}) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...color);
  values.forEach((value, index) => {
    const col = COLS[index];
    drawText(doc, value, columnX(index), y, { align: col.align, width: col.width });
  });
}

export function buildSlipPdfBlob({ slip, items }) {
  const doc = new jsPDF({ unit: "mm", format: "a6" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(COMPANY_DETAILS.name, MARGIN, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(COMPANY_DETAILS.address, MARGIN, 15);
  doc.text(`${COMPANY_DETAILS.phone} | ${COMPANY_DETAILS.email}`, MARGIN, 18.5);

  doc.setDrawColor(219, 234, 254);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 21, PAGE_WIDTH - MARGIN, 21);

  const paymentMode = PAYMENT_MODES[slip.payment_mode] || PAYMENT_MODES.CASH;
  const paymentStatus = PAYMENT_STATUSES[slip.payment_status] || PAYMENT_STATUSES.UNPAID;

  const details = [
    ["Date", formatDateTime(slip.created_at)],
    ["Name", slip.slip_name || "Sale Slip"],
    ["Phone", slip.customer_phone || "-"],
    ["Payment", `${paymentMode} (${paymentStatus})`]
  ];

  let detailY = 27;
  details.forEach(([label, value], index) => {
    const columnLeft = index % 2 === 0;
    const x = columnLeft ? MARGIN : MARGIN + CONTENT_WIDTH / 2;
    if (index % 2 === 0 && index > 0) detailY += 8;

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, detailY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), x, detailY + 3.5);
    doc.setFont("helvetica", "normal");
  });

  let y = detailY + 9;

  doc.setFillColor(239, 246, 255);
  doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, 5, "F");
  doc.setFontSize(6.5);
  drawRow(
    doc,
    COLS.map((col) => col.label),
    y,
    { bold: true, color: [30, 64, 175] }
  );
  y += 5;

  doc.setFontSize(7);
  items.forEach((item, index) => {
    if (y > PAGE_HEIGHT - 26) {
      doc.addPage("a6");
      y = 14;
    }

    drawRow(doc, [
      index + 1,
      item.product_name,
      formatNumber(item.quantity),
      formatCurrency(item.selling_price),
      formatCurrency(item.line_total)
    ], y);

    y += 4.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2);
  });

  y += 4;

  const roundOff = Number(slip.round_off || 0);
  const cashDiscount = Number(slip.cash_discount || 0);
  const gstAmount = Number(slip.gst_amount || 0);
  const goodsValue = Number(slip.goods_value || 0);
  if (roundOff !== 0 || cashDiscount !== 0 || gstAmount !== 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    const lines = [["Subtotal", formatCurrency(goodsValue + cashDiscount)]];
    if (cashDiscount !== 0) lines.push(["Cash Discount", `-${formatCurrency(cashDiscount)}`]);
    if (gstAmount !== 0) lines.push(["GST", `+${formatCurrency(gstAmount)}`]);
    if (roundOff !== 0) {
      lines.push(["Round Off", `${roundOff > 0 ? "+" : "-"}${formatCurrency(Math.abs(roundOff))}`]);
    }

    lines.forEach(([label, value], i) => {
      const lineY = y - 3 - (lines.length - 1 - i) * 4;
      doc.text(label, PAGE_WIDTH - MARGIN - 40, lineY);
      doc.text(value, PAGE_WIDTH - MARGIN, lineY, { align: "right" });
    });
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(PAGE_WIDTH - MARGIN - 40, y, 40, 12);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL AMOUNT", PAGE_WIDTH - MARGIN - 37, y + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(slip.total_amount), PAGE_WIDTH - MARGIN - 37, y + 9.5);

  return doc.output("blob");
}
