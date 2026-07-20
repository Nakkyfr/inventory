import { useCallback, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { exportRowsToCsv } from "../../lib/export";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { CREDIT_SETTLEMENT_MODES, DEBTOR_CATEGORIES } from "../../lib/appConfig";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";

function Credit() {
  const { can, shopId } = useRole();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("outstanding");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState({});
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCreditSales = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("sales")
      .select(
        "id, slip_name, customer_phone, customer_id, total_amount, amount_paid, payment_status, debtor_category, created_at, completed_at, customers(gst_number)"
      )
      .eq("shop_id", shopId)
      .eq("slip_type", "SALE")
      .eq("slip_status", "SOLD")
      .eq("payment_mode", "CREDIT")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setSales(
      (data || []).map((row) => ({
        ...row,
        gst_number: row.customers?.gst_number || "",
        amount_paid: Number(row.amount_paid || 0),
        total_amount: Number(row.total_amount || 0),
        due: Number(row.total_amount || 0) - Number(row.amount_paid || 0)
      }))
    );
  }, [shopId]);

  useMountFetch(fetchCreditSales, [fetchCreditSales]);

  async function loadHistory(saleId) {
    const { data } = await supabase
      .from("credit_payments")
      .select("id, amount, payment_mode, note, created_at")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: false });

    setHistory((prev) => ({ ...prev, [saleId]: data || [] }));
  }

  async function toggleExpand(saleId) {
    if (expandedId === saleId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(saleId);
    setAmount("");
    setMode("CASH");
    setNote("");

    if (!history[saleId]) {
      await loadHistory(saleId);
    }
  }

  async function recordPayment(sale) {
    setError("");
    setMessage("");

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Enter a valid payment amount");
      return;
    }

    if (numericAmount > sale.due) {
      setError(`Amount exceeds outstanding balance (${formatCurrency(sale.due)})`);
      return;
    }

    setSaving(true);

    const { error: rpcError } = await supabase.rpc("record_credit_payment", {
      p_sale_id: sale.id,
      p_amount: numericAmount,
      p_payment_mode: mode,
      p_note: note || null
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage(`Recorded ${formatCurrency(numericAmount)} against ${sale.slip_name || "this bill"}.`);
    setAmount("");
    setNote("");
    await loadHistory(sale.id);
    fetchCreditSales();
    window.dispatchEvent(new Event("credit:updated"));
    window.dispatchEvent(new Event("revenue:updated"));
  }

  function exportCredit() {
    exportRowsToCsv(
      "credit-ledger.csv",
      [
        { key: "slip_name", label: "Customer" },
        { key: "customer_phone", label: "Phone" },
        { key: "gst_number", label: "GST" },
        { key: "debtor_category", label: "Category" },
        { key: "total_amount", label: "Total" },
        { key: "amount_paid", label: "Paid" },
        { key: "due", label: "Due" },
        { key: "created_at", label: "Date" }
      ],
      visibleSales.map((row) => ({
        ...row,
        debtor_category: DEBTOR_CATEGORIES[row.debtor_category] || row.debtor_category || "",
        total_amount: row.total_amount.toFixed(2),
        amount_paid: row.amount_paid.toFixed(2),
        due: row.due.toFixed(2),
        created_at: formatDateTime(row.created_at)
      }))
    );
  }

  const visibleSales = sales.filter((row) => {
    if (categoryFilter !== "all" && row.debtor_category !== categoryFilter) return false;
    if (filter === "outstanding") return row.due > 0.004;
    if (filter === "settled") return row.due <= 0.004;
    return true;
  });

  const totalOutstanding = sales
    .filter((row) => categoryFilter === "all" || row.debtor_category === categoryFilter)
    .reduce((sum, row) => sum + Math.max(row.due, 0), 0);
  const marketOutstanding = sales
    .filter((row) => row.debtor_category === "MARKET")
    .reduce((sum, row) => sum + Math.max(row.due, 0), 0);
  const outsiderOutstanding = sales
    .filter((row) => row.debtor_category === "OUTSIDER")
    .reduce((sum, row) => sum + Math.max(row.due, 0), 0);

  const customerGroups = [];
  const groupByKey = {};
  visibleSales.forEach((sale) => {
    const key = sale.customer_id || `phone:${sale.customer_phone}` || `name:${sale.slip_name}`;
    if (!groupByKey[key]) {
      groupByKey[key] = {
        key,
        name: sale.slip_name,
        phone: sale.customer_phone,
        gst_number: sale.gst_number,
        due: 0,
        sales: []
      };
      customerGroups.push(groupByKey[key]);
    }
    groupByKey[key].due += Math.max(sale.due, 0);
    groupByKey[key].sales.push(sale);
  });

  const tabStyle = (active) => ({
    flex: 1,
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: active ? "#e6f0fa" : "#f2f2f2",
    color: "#111827",
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    cursor: "pointer"
  });

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 10,
    fontSize: 14,
    background: "#ffffff"
  };

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      {message && (
        <Box style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}>
          <p style={{ margin: 0, color: "#155e75" }}>{message}</p>
        </Box>
      )}

      <Box style={{ background: "#eff6ff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Total outstanding credit</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {formatCurrency(totalOutstanding)}
            </div>
          </div>
          {can("export") && (
            <button onClick={exportCredit} disabled={visibleSales.length === 0}>
              Export CSV
            </button>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #dbeafe",
            fontSize: 13,
            color: "#475569"
          }}
        >
          <span>Market: {formatCurrency(marketOutstanding)}</span>
          <span>Outsider: {formatCurrency(outsiderOutstanding)}</span>
        </div>
      </Box>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button style={tabStyle(filter === "outstanding")} onClick={() => setFilter("outstanding")}>
          Outstanding
        </button>
        <button style={tabStyle(filter === "settled")} onClick={() => setFilter("settled")}>
          Settled
        </button>
        <button style={tabStyle(filter === "all")} onClick={() => setFilter("all")}>
          Total
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={tabStyle(categoryFilter === "all")} onClick={() => setCategoryFilter("all")}>
          All
        </button>
        <button style={tabStyle(categoryFilter === "MARKET")} onClick={() => setCategoryFilter("MARKET")}>
          Market
        </button>
        <button style={tabStyle(categoryFilter === "OUTSIDER")} onClick={() => setCategoryFilter("OUTSIDER")}>
          Outsider
        </button>
      </div>

      {!loading && visibleSales.length === 0 && (
        <Box style={{ background: "#f8fafc" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No credit bills here</p>
        </Box>
      )}

      {customerGroups.map((group) => (
        <div key={group.key}>
          {group.sales.length > 1 && (
            <Box style={{ background: "#f1f5f9", border: "1px solid #cbd5e1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{group.name || "Untitled Customer"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {group.phone || "No phone"}
                    {group.gst_number ? ` · GST ${group.gst_number}` : ""} · {group.sales.length} bills
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: group.due > 0.004 ? "#b91c1c" : "#047857" }}>
                  {formatCurrency(group.due)}
                </div>
              </div>
            </Box>
          )}
          {group.sales.map((sale) => (
        <Box key={sale.id} style={{ background: "#faf7f2" }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
            onClick={() => toggleExpand(sale.id)}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 600 }}>{sale.slip_name || "Untitled Customer"}</div>
                {sale.debtor_category && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: sale.debtor_category === "MARKET" ? "#ede9fe" : "#e0f2fe",
                      color: sale.debtor_category === "MARKET" ? "#5b21b6" : "#075985"
                    }}
                  >
                    {DEBTOR_CATEGORIES[sale.debtor_category] || sale.debtor_category}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {sale.customer_phone || "No phone"} · {formatDateTime(sale.completed_at || sale.created_at)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Due</div>
              <div
                style={{
                  fontWeight: 700,
                  color: sale.due > 0.004 ? "#b91c1c" : "#047857"
                }}
              >
                {formatCurrency(sale.due)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
              marginTop: 10,
              fontSize: 13,
              color: "#334155"
            }}
          >
            <div>Total: {formatCurrency(sale.total_amount)}</div>
            <div style={{ textAlign: "right" }}>Paid: {formatCurrency(sale.amount_paid)}</div>
          </div>

          {expandedId === sale.id && (
            <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
              {can("collectCredit") && sale.due > 0.004 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Record a payment</div>
                  <input
                    type="number"
                    placeholder={`Amount (max ${sale.due.toFixed(2)})`}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    style={inputStyle}
                  />
                  <select value={mode} onChange={(event) => setMode(event.target.value)} style={inputStyle}>
                    {Object.entries(CREDIT_SETTLEMENT_MODES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    style={inputStyle}
                  />
                  <button
                    onClick={() => recordPayment(sale)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 8,
                      border: "none",
                      background: "#e6f0fa",
                      color: "#1f2937",
                      fontWeight: 500,
                      cursor: "pointer",
                      opacity: saving ? 0.6 : 1,
                      marginBottom: 14
                    }}
                  >
                    {saving ? "Recording..." : "Record Payment"}
                  </button>
                </>
              )}

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Payment history</div>
              {(history[sale.id] || []).length === 0 && (
                <div style={{ fontSize: 13, color: "#6b7280" }}>No payments recorded yet</div>
              )}
              {(history[sale.id] || []).map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "6px 0",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  <div>
                    <div>{formatCurrency(payment.amount)} · {CREDIT_SETTLEMENT_MODES[payment.payment_mode] || payment.payment_mode}</div>
                    {payment.note && <div style={{ color: "#64748b" }}>{payment.note}</div>}
                  </div>
                  <div style={{ color: "#64748b" }}>{formatDateTime(payment.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Box>
          ))}
        </div>
      ))}
    </>
  );
}

export default Credit;
