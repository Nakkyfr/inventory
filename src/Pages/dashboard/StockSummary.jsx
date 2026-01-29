import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Page from "../../components/layout/Page";

function StockSummary() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchStock();
  }, []);

  async function fetchStock() {
    const { data } = await supabase
      .from("inventory_in")
      .select(`
        remaining_quantity,
        purchase_price,
        master_products ( product_name )
      `);

    const map = {};

    (data || []).forEach(r => {
      const name = r.master_products.product_name;
      if (!map[name]) {
        map[name] = { qty: 0, cost: 0 };
      }
      map[name].qty += r.remaining_quantity;
      map[name].cost += r.remaining_quantity * r.purchase_price;
    });

    const result = Object.entries(map).map(([name, v]) => {
      const avg = v.qty ? (v.cost / v.qty).toFixed(2) : 0;
      let level = "OK";
      if (v.qty === 0) level = "OUT";
      else if (v.qty < 10) level = "LOW";

      return {
        name,
        qty: v.qty,
        avg,
        value: v.cost.toFixed(2),
        level
      };
    });

    setRows(result);
  }

  return (
    <Page title="Stock Summary">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 600 }}>
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
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td align="right">{r.qty}</td>
                <td align="right">₹{r.avg}</td>
                <td align="right">₹{r.value}</td>
                <td
                  align="center"
                  style={{
                    color:
                      r.level === "OUT"
                        ? "red"
                        : r.level === "LOW"
                        ? "orange"
                        : "green"
                  }}
                >
                  {r.level}
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
