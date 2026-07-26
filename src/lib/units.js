const BASE = "base";
export const BUNDLE = "bundle";

export function unitChoices(product) {
  const base = product?.unit || "Unit";
  const length = Number(product?.bundle_length) || 0;
  const choices = [{ value: BASE, label: base, factor: 1 }];
  if (length > 0) {
    choices.push({ value: BUNDLE, label: `Bundle (${length} ${base})`, factor: length });
  }
  return choices;
}

export function unitFactor(product, unitValue) {
  const choice = unitChoices(product).find((c) => c.value === unitValue);
  return choice ? choice.factor : 1;
}

export function defaultUnit(product) {
  return Number(product?.bundle_length) > 0 ? BUNDLE : BASE;
}

export function rescalePrice(price, fromFactor, toFactor) {
  if (price === "" || price == null) return price;
  const value = (Number(price) / fromFactor) * toFactor;

  return String(Number(value.toFixed(6)));
}

export function quantityToBase(quantity, factor) {
  return Number(quantity || 0) * factor;
}

export function priceToBase(price, factor) {
  return Number(price || 0) / factor;
}
