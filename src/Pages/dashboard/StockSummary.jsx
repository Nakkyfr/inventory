import { useCallback, useState } from "react";
import { supabase } from "../../supabaseClient";
import Page from "../../components/layout/Page";
import Box from "../../components/ui/Box";
import { exportRowsToCsv } from "../../lib/export";
import { formatCurrency, formatNumber } from "../../lib/format";
import { LOW_STOCK_THRESHOLD } from "../../lib/appConfig";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";

function StockSummary() {
  const [rows, setRows] = useState([]);
  const { can, shopId } = useRole();

  const fetchStock = useCallback(async () => {
    const { data } = await supabase
      .from("inventory_in")
      .select(`
        remaining_quantity,
        purchase_price,
        master_products ( product_name )
      `)
      .eq("shop_id", shopId);

    const map = {};

    (data || []).forEach((row) => {
      const name = row.master_products?.product_name || "Unknown Product";
      if (!map[name]) {
        map[name] = { qty: 0, cost: 0 };
      }
      map[name].qty += Number(row.remaining_quantity || 0);
      map[name].cost +=
        Number(row.remaining_quantity || 0) * Number(row.purchase_price || 0);
    });

    const result = Object.entries(map).map(([name, value]) => {
      const avg = value.qty ? value.cost / value.qty : 0;
      let level = "OK";

      if (value.qty === 0) level = "OUT";
      else if (value.qty < LOW_STOCK_THRESHOLD) level = "LOW";

      return {
        name,
        qty: value.qty,
        avg,
        value: value.cost,
        level
      };
    });

    setRows(result.sort((a, b) => a.name.localeCompare(b.name)));
  }, [shopId]);

  useMountFetch(fetchStock, [fetchStock]);

  const lowStockRows = rows.filter((row) => row.level !== "OK");

  function exportStock() {
    exportRowsToCsv(
      "stock-summary.csv",
      [
        { key: "name", label: "Item" },
        { key: "qty", label: "Quantity" },
        { key: "avg_cost", label: "Avg Cost" },
        { key: "stock_value", label: "Value" },
        { key: "level", label: "Level" }
      ],
      rows.map((row) => ({
        name: row.name,
        qty: row.qty,
        avg_cost: row.avg.toFixed(2),
        stock_value: row.value.toFixed(2),
        level: row.level
      }))
    );
  }

  return (
    <Page title="Stock Summary">
      <Box style={{ background: "#eff6ff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Low stock alerts</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {lowStockRows.length === 0
                ? "All items are above the alert threshold"
                : `${lowStockRows.length} items need attention`}
            </div>
          </div>
          {can("export") && (
            <button onClick={exportStock} disabled={rows.length === 0}>
              Export CSV
            </button>
          )}
        </div>
      </Box>

      {lowStockRows.length > 0 && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          {lowStockRows.map((row) => (
            <div
              key={row.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                marginBottom: 6
              }}
            >
              <span>{row.name}</span>
              <strong>
                {formatNumber(row.qty)} {row.level}
              </strong>
            </div>
          ))}
        </Box>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 600, background: "#ffffff" }}>
          <thead>
            <tr>
              <th align="left">Item</th>
              <th align="right">Qty</th>
              <th align="right">Avg Cost</th>
              <th align="right">Value</th>
              <th align="center">Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td align="right">{formatNumber(row.qty)}</td>
                <td align="right">{formatCurrency(row.avg)}</td>
                <td align="right">{formatCurrency(row.value)}</td>
                <td
                  align="center"
                  style={{
                    color:
                      row.level === "OUT"
                        ? "#dc2626"
                        : row.level === "LOW"
                        ? "#d97706"
                        : "#16a34a"
                  }}
                >
                  {row.level}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

export default StockSummary;
