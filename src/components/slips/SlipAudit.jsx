import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../ui/Box";
import { exportRowsToCsv } from "../../lib/export";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { shareSlipAsPdf } from "../../lib/shareSlip";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";
import { slipSearchFilter, applySlipSearch } from "../../lib/slipSearch";

function SlipAudit({ title }) {
  const { can, shopId } = useRole();
  const [rows, setRows] = useState([]);
  const [actorById, setActorById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sharingId, setSharingId] = useState(null);

  const [returnPanelId, setReturnPanelId] = useState(null);
  const [returnDrafts, setReturnDrafts] = useState({});
  const [returningId, setReturningId] = useState(null);
  const [search, setSearch] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");

    const filter = await slipSearchFilter(shopId, search);

    let query = supabase
      .from("sales")
      .select("*, sales_slip_items(*), customers(gst_number)")
      .eq("shop_id", shopId)
      .in("slip_type", ["SALE", "RETURN"])
      .neq("slip_status", "DRAFT");

    query = applySlipSearch(query, filter).order("created_at", { ascending: false });

    const { data, error: fetchError } = await query;

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setRows(data || []);
    if (can("viewAudit")) {
      const { data: users } = await supabase.rpc("owner_shop_users", { p_shop_id: shopId });
      const mapped = (users || []).reduce((acc, row) => {
        acc[row.id] = row.email || row.display_name || row.id.slice(0, 8);
        return acc;
      }, {});
      setActorById(mapped);
    }
  }, [can, shopId, search]);

  useMountFetch(fetchRows, [fetchRows]);

  const slipNameById = useMemo(
    () => rows.reduce((acc, row) => ({ ...acc, [row.id]: row.slip_name || "Untitled Slip" }), {}),
    [rows]
  );

  const alreadyReturnedByOriginal = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (row.slip_type !== "RETURN" || row.slip_status !== "SOLD" || !row.original_slip_id) return;
      const bucket = (map[row.original_slip_id] ||= {});
      (row.sales_slip_items || []).forEach((item) => {
        bucket[item.product_id] = (bucket[item.product_id] || 0) + Number(item.quantity || 0);
      });
    });
    return map;
  }, [rows]);

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

  async function shareSlip(row) {
    setSharingId(row.id);
    setError("");

    try {
      await shareSlipAsPdf({ slip: row, items: row.sales_slip_items || [] });
    } catch (shareError) {
      setError(shareError.message || "Unable to share slip");
    } finally {
      setSharingId(null);
    }
  }

  function toggleReturnPanel(row) {
    if (returnPanelId === row.id) {
      setReturnPanelId(null);
      return;
    }

    const alreadyReturned = alreadyReturnedByOriginal[row.id] || {};

    const totalsByProduct = {};
    (row.sales_slip_items || []).forEach((item) => {
      const bucket = (totalsByProduct[item.product_id] ||= {
        quantity: 0,
        lineTotal: 0,
        productName: item.product_name
      });
      bucket.quantity += Number(item.quantity || 0);
      bucket.lineTotal += Number(item.line_total || 0);
    });

    const draft = {};
    Object.entries(totalsByProduct).forEach(([productId, info]) => {
      draft[productId] = {
        quantity: "0",
        soldRate: info.quantity > 0 ? info.lineTotal / info.quantity : 0,
        remaining: info.quantity - (alreadyReturned[productId] || 0),
        productName: info.productName
      };
    });

    setReturnDrafts((prev) => ({ ...prev, [row.id]: draft }));
    setReturnPanelId(row.id);
    setError("");
  }

  function updateReturnDraft(saleId, productId, field, value) {
    setReturnDrafts((prev) => ({
      ...prev,
      [saleId]: {
        ...prev[saleId],
        [productId]: { ...prev[saleId][productId], [field]: value }
      }
    }));
  }

  async function confirmReturn(row) {
    const draft = returnDrafts[row.id] || {};
    const items = Object.entries(draft)
      .map(([productId, entry]) => ({
        product_id: productId,
        quantity: Number(entry.quantity) || 0
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setError("Enter a return quantity for at least one item");
      return;
    }

    setReturningId(row.id);
    setError("");

    const { error: returnError } = await supabase.rpc("create_partial_return", {
      p_original_slip_id: row.id,
      p_items: items
    });

    setReturningId(null);

    if (returnError) {
      setError(returnError.message);
      return;
    }

    setReturnPanelId(null);
    fetchRows();
    window.dispatchEvent(new Event("revenue:updated"));
  }

  function exportAudit() {
    exportRowsToCsv(
      "sales-audit.csv",
      [
        { key: "slip_type", label: "Type" },
        { key: "slip_name", label: "Slip Name" },
        { key: "created_by", label: "Created By" },
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
              Sales and returns with profit trail
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

      <input
        type="text"
        placeholder="Search name, phone or GST number"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          marginBottom: 12,
          fontSize: 15,
          background: "#ffffff"
        }}
      />

      {!loading && rows.length === 0 && (
        <Box>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {search ? `No slips match "${search}"` : "No audit records yet"}
          </p>
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
              {(row.customer_phone || row.customers?.gst_number) && (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {row.customer_phone}
                  {row.customers?.gst_number ? ` · GST ${row.customers.gst_number}` : ""}
                </div>
              )}
              {row.slip_type === "RETURN" && row.original_slip_id && (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Return against: {slipNameById[row.original_slip_id] || row.original_slip_id.slice(0, 8)}
                </div>
              )}
              {can("viewAudit") && row.created_by && (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  By: {actorById[row.created_by] || row.created_by.slice(0, 8)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: row.slip_type === "RETURN" ? "#fef3c7" : "#e6f0fa",
                  color: row.slip_type === "RETURN" ? "#92400e" : "#1f2937"
                }}
              >
                {row.slip_type}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: row.slip_status === "VOID" ? "#b91c1c" : "#0369a1"
                }}
              >
                {row.slip_status}
              </span>
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

          <button
            style={{
              marginTop: 12,
              width: "100%",
              height: 40,
              borderRadius: 8,
              border: "none",
              background: "#dcfce7",
              color: "#166534"
            }}
            disabled={sharingId === row.id}
            onClick={() => shareSlip(row)}
          >
            {sharingId === row.id ? "Preparing PDF..." : "Share as PDF"}
          </button>

          {can("void") && row.slip_type === "SALE" && row.slip_status === "SOLD" && (
            <button
              style={{
                marginTop: 8,
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a"
              }}
              disabled={loading}
              onClick={() => toggleReturnPanel(row)}
            >
              {returnPanelId === row.id ? "Cancel Return" : "Return Items"}
            </button>
          )}

          {can("void") && row.slip_status !== "VOID" && (
            <button
              style={{
                marginTop: 8,
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

          {returnPanelId === row.id && (
            <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Return items</div>
              {Object.entries(returnDrafts[row.id] || {}).map(([productId, entry]) => (
                <div key={productId} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    {entry.productName}{" "}
                    <span style={{ color: "#64748b" }}>({entry.remaining} returnable)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      max={entry.remaining}
                      placeholder="Qty"
                      value={entry.quantity}
                      onChange={(event) => updateReturnDraft(row.id, productId, "quantity", event.target.value)}
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box"
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#475569",
                        fontSize: 13,
                        boxSizing: "border-box"
                      }}
                    >
                      Sold at {formatCurrency(entry.soldRate)}
                    </div>
                  </div>
                  {Number(entry.quantity) > 0 && (
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Refund {formatCurrency(Number(entry.quantity) * entry.soldRate)} + GST
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => confirmReturn(row)}
                disabled={returningId === row.id}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: "#e6f0fa",
                  color: "#1f2937"
                }}
              >
                {returningId === row.id ? "Processing..." : "Confirm Return"}
              </button>
            </div>
          )}
        </Box>
      ))}
    </>
  );
}

export default SlipAudit;
