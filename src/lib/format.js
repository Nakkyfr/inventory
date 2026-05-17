export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}
