import { supabase } from "../supabaseClient";

const RESULT_LIMIT = 200;

function escapeLike(value) {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export async function searchProducts(shopId, term) {
  let query = supabase
    .from("master_products")
    .select("product_id, product_name, unit, bundle_length, list_price, sale_discount_percent, gst_percent")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("product_name")
    .limit(RESULT_LIMIT + 1);

  for (const word of term.trim().split(/\s+/).filter(Boolean)) {
    query = query.ilike("product_name", `%${escapeLike(word)}%`);
  }

  const { data, error } = await query;
  if (error) return [];

  const rows = data || [];
  const results = rows.slice(0, RESULT_LIMIT).map((row) => ({
    id: row.product_id,
    label: row.product_name,
    unit: row.unit,
    bundle_length: row.bundle_length,
    list_price: row.list_price,
    sale_discount_percent: row.sale_discount_percent,
    gst_percent: row.gst_percent
  }));

  results.truncated = rows.length > RESULT_LIMIT;
  return results;
}
