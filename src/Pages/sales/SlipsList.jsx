import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { printSaleSlip } from "../../lib/printSlip";
import { shareSlipAsPdf } from "../../lib/shareSlip";
import { PAYMENT_MODES } from "../../lib/appConfig";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";

function SlipsList() {
  const navigate = useNavigate();
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { can, shopId } = useRole();

  const fetchSlips = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("sales")
      .select("id, slip_name, total_amount, created_at, customer_phone, payment_status, payment_mode, slip_status")
      .eq("shop_id", shopId)
      .eq("slip_type", "SALE")
      .eq("slip_status", "DRAFT")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSlips(data || []);
    }
  }, [shopId]);

  useMountFetch(fetchSlips, [fetchSlips]);

  async function markSold(slip) {
    if (!can("finalize")) {
      setError("Your role cannot finalize sales.");
      return;
    }

    let amountReceived = null;

    if (slip.payment_mode === "CREDIT") {
      const input = window.prompt(
        `Amount received now (out of ${formatCurrency(slip.total_amount)})? Leave blank for fully on credit.`,
        "0"
      );
      if (input === null) return;

      const numeric = input.trim() === "" ? 0 : Number(input);
      if (Number.isNaN(numeric) || numeric < 0 || numeric > slip.total_amount) {
        setError(`Enter an amount between 0 and ${formatCurrency(slip.total_amount)}`);
        return;
      }
      amountReceived = numeric;
    } else if (!window.confirm("Mark this slip as sold?")) {
      return;
    }

    setLoading(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("finalize_slip", {
      p_slip_id: slip.id,
      p_amount_received: amountReceived
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSlips((prev) => prev.filter((entry) => entry.id !== slip.id));
    window.dispatchEvent(new Event("revenue:updated"));
  }

  async function fetchSlipItems(slip) {
    const { data: items, error: itemsError } = await supabase
      .from("sales_slip_items")
      .select("id, product_name, quantity, selling_price, line_total")
      .eq("slip_id", slip.id)
      .order("id");

    if (itemsError) throw itemsError;
    return items || [];
  }

  async function handlePrintSlip(slip) {
    setLoading(true);
    setError("");

    try {
      const items = await fetchSlipItems(slip);
      printSaleSlip({ slip, items });
    } catch (printError) {
      setError(printError.message || "Unable to print slip");
    } finally {
      setLoading(false);
    }
  }

  async function handleShareSlip(slip) {
    setLoading(true);
    setError("");

    try {
      const items = await fetchSlipItems(slip);
      await shareSlipAsPdf({ slip, items });
    } catch (shareError) {
      setError(shareError.message || "Unable to share slip");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSlip(id) {
    if (!window.confirm("Delete this slip?")) return;

    setLoading(true);
    setError("");

    const { error: itemsError } = await supabase.from("sales_slip_items").delete().eq("slip_id", id);
    const { error: slipError } = itemsError ? {} : await supabase.from("sales").delete().eq("id", id);

    setLoading(false);

    if (itemsError || slipError) {
      setError((itemsError || slipError).message);
      return;
    }

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
            <div
              style={{
                display: "inline-block",
                marginTop: 6,
                fontSize: 11,
                fontWeight: 600,
                color: "#1f2937",
                background: "#e6f0fa",
                borderRadius: 999,
                padding: "2px 8px"
              }}
            >
              {PAYMENT_MODES[slip.payment_mode] || PAYMENT_MODES.CASH}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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
                border: "none",
                background: "#dcfce7",
                color: "#166534",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 6px",
                lineHeight: 1.1
              }}
              disabled={loading}
              onClick={() => handleShareSlip(slip)}
            >
              Share
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
