export const SLOT_ORDER = ["size", "type", "spec", "pack", "brand", "series"];

export function buildBaseName(slots) {
  return SLOT_ORDER.map((k) => (slots[k] || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function buildProductName(baseName, color) {
  return color ? `${baseName} ${color}`.replace(/\s+/g, " ").trim() : baseName;
}

export function unknownTokens(baseName, vocabulary) {
  return baseName
    .split(/[\s()]+/)
    .filter(Boolean)
    .filter((t) => !/^[\d.]/.test(t) && t.length > 2 && !vocabulary.tokens.has(t));
}
