import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../ui/Box";
import { SHOP_ID } from "../../lib/appConfig";
import { exportRowsToCsv } from "../../lib/export";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useRole } from "../../context/useRole";

function SlipAudit({ slipType, title }) {
  const { can } = useRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("sales")
      .select("*, sales_slip_items(*)")
      .eq("shop_id", SHOP_ID)
      .eq("slip_type", slipType)
      .neq("slip_status", "DRAFT")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setRows(data || []);
  }, [slipType]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchRows();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchRows]);

  async function voidSlip(row) {
    if (!can("void")) return;
    if (!window.confirm(`Void "${row.slip_name || "Untitled"}"?`)) return;

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.rpc("void_slip", {
      p_slip_id: row.id
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    fetchRows();
    window.dispatchEvent(new Event("revenue:updated"));
  }

  function exportAudit() {
    exportRowsToCsv(
      `${slipType.toLowerCase()}-audit.csv`,
      [
        { key: "slip_name", label: "Slip Name" },
        { key: "slip_status", label: "Status" },
        { key: "total_amount", label: "Total Amount" },
        { key: "cost_of_goods_sold", label: "Cost of Goods Sold" },
        { key: "gross_profit", label: "Gross Profit" },
        { key: "completed_at", label: "Completed At" },
        { key: "created_at", label: "Created At" }
      ],
      rows.map((row) => ({
        ...row,
        completed_at: formatDateTime(row.completed_at),
        created_at: formatDateTime(row.created_at)
      }))
    );
  }

  return (
    <>
      <Box style={{ background: "#eff6ff" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Completed and voided slips with profit trail
            </div>
          </div>
          {can("export") && (
            <button onClick={exportAudit} disabled={rows.length === 0 || loading}>
              Export CSV
            </button>
          )}
        </div>
      </Box>

      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      {!loading && rows.length === 0 && (
        <Box>
          <p style={{ color: "#6b7280", margin: 0 }}>No audit records yet</p>
        </Box>
      )}

      {rows.map((row) => (
        <Box key={row.id} style={{ background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{row.slip_name || "Untitled Slip"}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {formatDateTime(row.completed_at || row.created_at)}
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: row.slip_status === "VOID" ? "#b91c1c" : "#0369a1"
              }}
            >
              {row.slip_status}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 12
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Amount</div>
              <div style={{ fontWeight: 600 }}>{formatCurrency(row.total_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>COGS</div>
              <div style={{ fontWeight: 600 }}>
                {row.cost_of_goods_sold == null
                  ? "-"
                  : formatCurrency(row.cost_of_goods_sold)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Profit</div>
              <div
                style={{
                  fontWeight: 600,
                  color:
                    Number(row.gross_profit || 0) >= 0 ? "#047857" : "#b91c1c"
                }}
              >
                {row.gross_profit == null ? "-" : formatCurrency(row.gross_profit)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#475569" }}>
            {(row.sales_slip_items || []).map((item) => (
              <div key={item.id || `${row.id}-${item.product_id}`}>
                {item.product_name} · {item.quantity} x {formatCurrency(item.selling_price)}
              </div>
            ))}
          </div>

          {can("void") && row.slip_status !== "VOID" && (
            <button
              style={{
                marginTop: 12,
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "none",
                background: "#fef2f2",
                color: "#991b1b"
              }}
              disabled={loading}
              onClick={() => voidSlip(row)}
            >
              Void Slip
            </button>
          )}
        </Box>
      ))}
    </>
  );
}

export default SlipAudit;
