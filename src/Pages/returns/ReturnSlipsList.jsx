import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { SHOP_ID } from "../../lib/appConfig";
import { buildStockMap, getWeightedAverageCost } from "../../lib/inventory";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useRole } from "../../context/useRole";

function ReturnSlipsList() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { can } = useRole();

  const fetchSlips = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("sales")
      .select("id, slip_name, total_amount, created_at")
      .eq("shop_id", SHOP_ID)
      .eq("slip_type", "RETURN")
      .eq("slip_status", "DRAFT")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSlips(data || []);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchSlips();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSlips]);

  async function markReturned(slip) {
    if (!can("finalize")) {
      setError("Your role cannot finalize returns.");
      return;
    }

    if (!window.confirm("Confirm this return?")) return;

    setLoading(true);
    setError("");

    const { data: items, error: itemsError } = await supabase
      .from("sales_slip_items")
      .select("product_id, quantity")
      .eq("slip_id", slip.id);

    if (itemsError) {
      setLoading(false);
      setError(itemsError.message);
      return;
    }

    const productIds = [...new Set((items || []).map((item) => item.product_id))];
    const { data: stockRows, error: stockError } = await supabase
      .from("inventory_in")
      .select("product_id, remaining_quantity, purchase_price")
      .in("product_id", productIds);

    if (stockError) {
      setLoading(false);
      setError(stockError.message);
      return;
    }

    const stockMap = buildStockMap(stockRows);
    const stockCredit = (items || []).reduce((sum, item) => {
      const averageCost = getWeightedAverageCost(stockMap, item.product_id);
      return sum + Number(item.quantity || 0) * averageCost;
    }, 0);

    const fullPayload = {
      slip_status: "SOLD",
      completed_at: new Date().toISOString(),
      cost_of_goods_sold: Number((-stockCredit).toFixed(2)),
      gross_profit: Number((stockCredit - Number(slip.total_amount || 0)).toFixed(2)),
      pricing_method: "WEIGHTED_AVG"
    };

    let { error: updateError } = await supabase
      .from("sales")
      .update(fullPayload)
      .eq("id", slip.id)
      .eq("slip_status", "DRAFT");

    if (updateError && updateError.message.toLowerCase().includes("column")) {
      const fallback = await supabase
        .from("sales")
        .update({
          slip_status: "SOLD",
          completed_at: fullPayload.completed_at
        })
        .eq("id", slip.id)
        .eq("slip_status", "DRAFT");

      updateError = fallback.error;
    }

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSlips((prev) => prev.filter((entry) => entry.id !== slip.id));
    window.dispatchEvent(new Event("revenue:updated"));
  }

  async function deleteSlip(id) {
    if (!window.confirm("Delete this return slip?")) return;

    setLoading(true);
    setError("");

    await supabase.from("sales_slip_items").delete().eq("slip_id", id);
    await supabase.from("sales").delete().eq("id", id);

    setLoading(false);
    setSlips((prev) => prev.filter((entry) => entry.id !== id));
  }

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      <Box style={{ background: "#eff6ff" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Pending returns</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Return slips persist a weighted-average reversal estimate and leave stock
          restoration to Supabase.
        </div>
      </Box>

      {slips.length === 0 && (
        <Box style={{ background: "#f8fafc" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No saved return slips</p>
        </Box>
      )}

      {slips.map((slip) => (
        <Box key={slip.id} style={{ background: "#faf7f2" }}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>{slip.slip_name || "Untitled Return"}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {formatCurrency(slip.total_amount)} · {formatDateTime(slip.created_at)}
            </div>
          </div>

          <button
            style={{
              width: "100%",
              height: 40,
              borderRadius: 8,
              border: "none",
              background: "#e6f0fa",
              color: "#1f2937",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              marginTop: 8,
              opacity: !can("finalize") ? 0.6 : 1
            }}
            disabled={loading || !can("finalize")}
            onClick={() => markReturned(slip)}
          >
            Confirm Return
          </button>

          <button
            style={{
              width: "100%",
              height: 40,
              borderRadius: 8,
              border: "none",
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              marginTop: 8
            }}
            disabled={loading}
            onClick={() => deleteSlip(slip.id)}
          >
            Delete Slip
          </button>
        </Box>
      ))}
    </>
  );
}

export default ReturnSlipsList;
