import { COMPANY_DETAILS, PAYMENT_STATUSES } from "./appConfig";
import { formatCurrency, formatDateTime, formatNumber } from "./format";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

export function buildWhatsappText({ slip, items, paymentStatus }) {
  const lines = [
    COMPANY_DETAILS.name,
    `Name: ${slip.slip_name || "Sale Slip"}`,
    `Date: ${formatDateTime(slip.created_at)}`,
    `Phone: ${slip.customer_phone || "-"}`,
    `Payment: ${PAYMENT_STATUSES[paymentStatus] || PAYMENT_STATUSES.UNPAID}`,
    ""
  ];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.product_name} - ${item.quantity} x ${formatCurrency(item.selling_price)} = ${formatCurrency(item.line_total)}`
    );
  });

  lines.push("");
  const off = Number(slip.round_off || 0);
  const discount = Number(slip.cash_discount || 0);
  const gst = Number(slip.gst_amount || 0);
  const goods = Number(slip.goods_value || 0);
  if (off !== 0 || discount !== 0 || gst !== 0) {
    lines.push(`Subtotal: ${formatCurrency(goods + discount)}`);
    if (discount !== 0) lines.push(`Cash Discount: -${formatCurrency(discount)}`);
    if (gst !== 0) lines.push(`GST: +${formatCurrency(gst)}`);
    if (off !== 0) lines.push(`Round Off: ${off > 0 ? "+" : "-"}${formatCurrency(Math.abs(off))}`);
  }
  lines.push(`Total: ${formatCurrency(slip.total_amount)}`);

  return encodeURIComponent(lines.join("\n"));
}

function adjustmentRows(slip) {
  const off = Number(slip.round_off || 0);
  const discount = Number(slip.cash_discount || 0);
  const gst = Number(slip.gst_amount || 0);
  const goods = Number(slip.goods_value || 0);
  if (off === 0 && discount === 0 && gst === 0) return "";

  const small = 'class="total-value" style="font-size:14px"';
  let html = `
    <div class="total-label">Subtotal</div>
    <div ${small}>${formatCurrency(goods + discount)}</div>`;
  if (discount !== 0) {
    html += `
    <div class="total-label">Cash Discount ${Number(slip.cash_discount_percent || 0)}%</div>
    <div ${small}>−${formatCurrency(discount)}</div>`;
  }
  if (gst !== 0) {
    html += `
    <div class="total-label">GST</div>
    <div ${small}>+${formatCurrency(gst)}</div>`;
  }
  if (off !== 0) {
    html += `
    <div class="total-label">Round Off</div>
    <div ${small}>${off > 0 ? "+" : "−"}${formatCurrency(Math.abs(off))}</div>`;
  }
  return html;
}

export function printSaleSlip({ slip, items }) {
  const printWindow = window.open("", "_blank", "width=420,height=680");

  if (!printWindow) {
    throw new Error("Popup blocked. Allow popups to print slips.");
  }

  const rowsHtml = items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.product_name)}</td>
          <td class="right">${formatNumber(item.quantity)}</td>
          <td class="right">${formatCurrency(item.selling_price)}</td>
          <td class="right">${formatCurrency(item.line_total)}</td>
        </tr>
      `
    )
    .join("");

  const logoHtml = COMPANY_DETAILS.logoUrl
    ? `<img src="${escapeHtml(COMPANY_DETAILS.logoUrl)}" alt="" class="logo" onerror="this.style.display='none'" />`
    : "";

  const initialStatus = slip.payment_status || "UNPAID";
  const phone = normalizePhone(slip.customer_phone);

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(slip.slip_name || "Sale Slip")}</title>
        <style>
          @page {
            size: 105mm 148mm;
            margin: 5mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            background: #e2e8f0;
          }
          .actions {
            width: 105mm;
            margin: 12px auto 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-bottom: none;
          }
          .action-group {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .toggle {
            height: 34px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            padding: 0 12px;
            cursor: pointer;
            font-weight: 600;
          }
          .toggle.active {
            background: #e6f0fa;
          }
          .sheet {
            width: 105mm;
            min-height: 148mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 6mm;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1.5px solid #dbeafe;
          }
          .logo {
            width: 32px;
            height: 32px;
            object-fit: contain;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 3px;
            background: #ffffff;
          }
          .company-name {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 2px;
          }
          .company-meta {
            font-size: 7.5px;
            color: #475569;
            line-height: 1.4;
          }
          .details {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 10px;
            margin-bottom: 8px;
          }
          .label {
            font-size: 7px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 2px;
          }
          .value {
            font-size: 10px;
            font-weight: 600;
            word-break: break-word;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          th,
          td {
            border-bottom: 1px solid #cbd5e1;
            padding: 4px 3px;
            text-align: left;
            font-size: 8.5px;
            vertical-align: top;
          }
          th {
            background: #eff6ff;
            font-size: 7.5px;
          }
          .right {
            text-align: right;
            white-space: nowrap;
          }
          .total {
            margin-top: 8px;
            display: flex;
            justify-content: flex-end;
          }
          .total-box {
            width: 38mm;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 8px;
            background: #f8fafc;
          }
          .total-label {
            color: #64748b;
            font-size: 7px;
            margin-bottom: 3px;
          }
          .total-value {
            font-size: 14px;
            font-weight: 700;
          }
          .button-link {
            height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            border-radius: 8px;
            text-decoration: none;
            border: 1px solid #cbd5e1;
            color: #0f172a;
            background: #ffffff;
            font-weight: 600;
          }
          @media print {
            body {
              background: transparent;
            }
            .actions {
              display: none;
            }
            .sheet {
              width: auto;
              min-height: auto;
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="actions">
          <div class="action-group">
            ${
              phone
                ? `<a id="waLink" class="button-link" href="#" target="_blank" rel="noreferrer">WhatsApp</a>`
                : `<span class="button-link" style="opacity:.5">No Phone</span>`
            }
            <button class="button-link" onclick="window.print()" type="button">Print</button>
          </div>
        </div>
        <div class="sheet">
          <div class="brand">
            ${logoHtml}
            <div>
              <div class="company-name">${escapeHtml(COMPANY_DETAILS.name)}</div>
              <div class="company-meta">
                <div>${escapeHtml(COMPANY_DETAILS.address)}</div>
                <div>${escapeHtml(COMPANY_DETAILS.phone)}</div>
                <div>${escapeHtml(COMPANY_DETAILS.email)}</div>
              </div>
            </div>
          </div>

          <div class="details">
            <div>
              <div class="label">Date</div>
              <div class="value">${escapeHtml(formatDateTime(slip.created_at))}</div>
            </div>
            <div>
              <div class="label">Name</div>
              <div class="value">${escapeHtml(slip.slip_name || "Sale Slip")}</div>
            </div>
            <div>
              <div class="label">Phone</div>
              <div class="value">${escapeHtml(slip.customer_phone || "-")}</div>
            </div>
            <div>
              <div class="label">Payment</div>
              <div class="value">${escapeHtml(PAYMENT_STATUSES[initialStatus])}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Rate</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total">
            <div class="total-box">
              ${adjustmentRows(slip)}
              <div class="total-label">Total Amount</div>
              <div class="total-value">${formatCurrency(slip.total_amount)}</div>
            </div>
          </div>
        </div>
        <script>
          const phone = ${JSON.stringify(phone)};
          const waLink = document.getElementById("waLink");
          if (waLink && phone) {
            waLink.href = "https://wa.me/" + phone + "?text="
              + ${JSON.stringify(buildWhatsappText({ slip, items, paymentStatus: initialStatus }))};
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
