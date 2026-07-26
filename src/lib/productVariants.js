const COLORS = new Set([
  "WHITE", "BLACK", "GREY", "GRAY", "RED", "BLUE", "YELLOW", "GREEN", "BROWN", "IVORY",
  "BEIGE", "GOLD", "SILVER", "BRONZE", "PINK", "ORANGE", "PURPLE", "WALNUT", "CHAMPAGNE",
  "GRAPHITE", "MAROON", "BLK", "BRN"
]);

const NOT_A_COLOR_BEFORE = new Set(["CARD"]);

export function splitColor(productName) {

  const tokens = String(productName || "")
    .trim()
    .replace(/\bROSE\s+GOLD\b/gi, "ROSEGOLD")
    .split(/\s+/);
  const found = [];

  const rest = tokens.filter((token, i) => {
    const bare = token.replace(/[()]/g, "").toUpperCase();
    const bracketed = token !== token.replace(/[()]/g, "");
    const next = (tokens[i + 1] || "").replace(/[()]/g, "").toUpperCase();
    if (COLORS.has(bare) && !bracketed && !NOT_A_COLOR_BEFORE.has(next)) {
      found.push(bare);
      return false;
    }
    return true;
  });

  if (found.length !== 1) return { base: null, color: null };
  return { base: rest.join(" "), color: found[0] };
}

export function colorSiblings(product, candidates) {
  const { base } = splitColor(product?.label);
  if (!base) return [];
  return candidates.filter((c) => {
    const split = splitColor(c.label);
    return split.base === base;
  });
}
