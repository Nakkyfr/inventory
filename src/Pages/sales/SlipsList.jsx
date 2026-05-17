import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { SHOP_ID } from "../../lib/appConfig";
import {
  buildStockMap,
  checkStockAvailability,
  getWeightedAverageCost
} from "../../lib/inventory";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { printSaleSlip } from "../../lib/printSlip";
import { useRole } from "../../context/useRole";

function SlipsList() {
  const navigate = useNavigate();
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { can } = useRole();

  const fetchSlips = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("sales")
      .select("id, slip_name, total_amount, created_at, customer_phone, payment_status, slip_status")
      .eq("shop_id", SHOP_ID)
      .eq("slip_type", "SALE")
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

  async function markSold(slip) {
    if (!can("finalize")) {
      setError("Your role cannot finalize sales.");
      return;
    }

    if (!window.confirm("Mark this slip as sold?")) return;

    setLoading(true);
    setError("");

    const { data: items, error: itemsError } = await supabase
      .from("sales_slip_items")
      .select("product_id, product_name, quantity, selling_price, line_total")
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
    const issues = checkStockAvailability(items || [], stockMap);

    if (issues.length > 0) {
      setLoading(false);
      setError(
        `Insufficient stock for ${issues
          .map((issue) => `${issue.productId} (${issue.availableQty}/${issue.requiredQty})`)
          .join(", ")}`
      );
      return;
    }

    const costOfGoodsSold = (items || []).reduce((sum, item) => {
      const averageCost = getWeightedAverageCost(stockMap, item.product_id);
      return sum + Number(item.quantity || 0) * averageCost;
    }, 0);

    const grossProfit = Number(slip.total_amount || 0) - costOfGoodsSold;

    const fullPayload = {
      slip_status: "SOLD",
      completed_at: new Date().toISOString(),
      cost_of_goods_sold: Number(costOfGoodsSold.toFixed(2)),
      gross_profit: Number(grossProfit.toFixed(2)),
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

  async function handlePrintSlip(slip) {
    setLoading(true);
    setError("");

    const { data: items, error: itemsError } = await supabase
      .from("sales_slip_items")
      .select("id, product_name, quantity, selling_price, line_total")
      .eq("slip_id", slip.id)
      .order("id");

    setLoading(false);

    if (itemsError) {
      setError(itemsError.message);
      return;
    }

    try {
      printSaleSlip({
        slip,
        items: items || []
      });
    } catch (printError) {
      setError(printError.message || "Unable to print slip");
    }
  }

  async function deleteSlip(id) {
    if (!window.confirm("Delete this slip?")) return;

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
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Pending sales</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          Finalization uses weighted-average cost and blocks overselling based on current
          stock visible to the frontend.
        </div>
      </Box>

      {slips.length === 0 && (
        <Box style={{ background: "#f8fafc" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No saved sale slips</p>
        </Box>
      )}

      {slips.map((slip) => (
        <Box key={slip.id} style={{ background: "#faf7f2" }}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>{slip.slip_name || "Untitled Slip"}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {formatCurrency(slip.total_amount)} · {formatDateTime(slip.created_at)}
            </div>
            {slip.customer_phone && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {slip.customer_phone}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
              marginTop: 10
            }}
          >
            <button
              style={{
                width: "100%",
                aspectRatio: "2 / 1",
                borderRadius: 8,
                border: "none",
                background: "#f8fafc",
                color: "#0f172a",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 6px",
                lineHeight: 1.1
              }}
              disabled={loading}
              onClick={() => handlePrintSlip(slip)}
            >
              Print
            </button>

            <button
              style={{
                width: "100%",
                aspectRatio: "2 / 1",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 6px",
                lineHeight: 1.1
              }}
              disabled={loading}
              onClick={() => navigate(`/sales/edit/${slip.id}`)}
            >
              Edit
            </button>

            <button
              style={{
                width: "100%",
                aspectRatio: "2 / 1",
                borderRadius: 8,
                border: "none",
                background: "#e6f0fa",
                color: "#1f2937",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                opacity: !can("finalize") ? 0.6 : 1,
                padding: "4px 6px",
                lineHeight: 1.1
              }}
              disabled={loading || !can("finalize")}
              onClick={() => markSold(slip)}
            >
              Sold
            </button>

            <button
              style={{
                width: "100%",
                aspectRatio: "2 / 1",
                borderRadius: 8,
                border: "none",
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 6px",
                lineHeight: 1.1
              }}
              disabled={loading}
              onClick={() => deleteSlip(slip.id)}
            >
              Delete
            </button>
          </div>
        </Box>
      ))}
    </>
  );
}

export default SlipsList;