import { supabase } from "../supabaseClient";

const RESULT_LIMIT = 50;

// Server-side, per-keystroke product search — never loads the full catalog
// (master_products.select() without a limit silently truncates at
// Supabase/PostgREST's default 1000-row cap once a shop has more products
// than that, which is exactly what made the old plain <select> unusable).
export async function searchProducts(shopId, term) {
  let query = supabase
    .from("master_products")
    .select("product_id, product_name, bundle_length, list_price, sale_discount_percent")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("product_name")
    .limit(RESULT_LIMIT);

  const trimmed = term.trim();
  if (trimmed) {
    query = query.ilike("product_name", `%${trimmed}%`);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data || []).map((row) => ({
    id: row.product_id,
    label: row.product_name,
    bundle_length: row.bundle_length,
    list_price: row.list_price,
    sale_discount_percent: row.sale_discount_percent
  }));
}
