import { supabase } from "../supabaseClient";

function escapeTerm(value) {
  return value.replace(/[%_,()]/g, " ").trim();
}

export async function slipSearchFilter(shopId, term) {
  const trimmed = escapeTerm(String(term || ""));
  if (!trimmed) return null;

  const clauses = [
    `slip_name.ilike.%${trimmed}%`,
    `customer_phone.ilike.%${trimmed}%`
  ];

  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("shop_id", shopId)
    .or(`gst_number.ilike.%${trimmed}%,name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
    .limit(200);

  const ids = (data || []).map((row) => row.id);
  if (ids.length) clauses.push(`customer_id.in.(${ids.join(",")})`);

  return clauses.join(",");
}

export function applySlipSearch(query, filter) {
  return filter ? query.or(filter) : query;
}
