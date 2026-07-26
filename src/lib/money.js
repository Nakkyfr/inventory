export function roundToRupee(amount) {
  const n = Number(amount || 0);
  return Math.sign(n) * Math.round(Math.abs(n));
}

export function roundOffAmount(subtotal) {
  const n = Number(subtotal || 0);
  return Number((roundToRupee(n) - n).toFixed(2));
}
