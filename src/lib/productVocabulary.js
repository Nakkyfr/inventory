import { supabase } from "../supabaseClient";

export async function fetchVocabulary(shopId) {
  const empty = { colors: [], units: [], bundleLengths: [], tokens: new Set(), names: new Set() };

  const { data, error } = await supabase
    .from("master_products")
    .select("product_name, base_name, color, unit, bundle_length")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .limit(5000);

  if (error) return empty;

  const colors = new Set();
  const units = new Set();
  const bundleLengths = new Set();
  const tokens = new Set();
  const names = new Set();

  for (const row of data || []) {
    if (row.color) colors.add(row.color);
    if (row.unit) units.add(row.unit);
    if (row.bundle_length != null) bundleLengths.add(Number(row.bundle_length));
    names.add(row.product_name.toUpperCase());
    for (const t of String(row.base_name || row.product_name).split(/[\s()]+/)) {
      if (t) tokens.add(t.toUpperCase());
    }
  }

  return {
    colors: [...colors].sort(),
    units: [...units].sort(),
    bundleLengths: [...bundleLengths].sort((a, b) => a - b),
    tokens,
    names
  };
}
