import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { formatCurrency } from "../../lib/format";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";

function RevenueProfit() {
  const { shopId } = useRole();
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [monthProfit, setMonthProfit] = useState(0);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setError("");

      const today = new Date().toISOString().slice(0, 10);
      const monthKey = today.slice(0, 7) + "-01";

      const { data: tr } = await supabase
        .from("revenue_daily")
        .select("revenue")
        .eq("shop_id", shopId)
        .eq("day", today)
        .maybeSingle();

      const { data: mr } = await supabase
        .from("revenue_monthly")
        .select("revenue")
        .eq("shop_id", shopId)
        .eq("month", monthKey)
        .maybeSingle();

      const { data: tp } = await supabase
        .from("profit_daily")
        .select("profit")
        .eq("shop_id", shopId)
        .eq("day", today)
        .maybeSingle();

      const { data: mp } = await supabase
        .from("profit_monthly")
        .select("profit")
        .eq("shop_id", shopId)
        .eq("month", monthKey)
        .maybeSingle();

      setTodayRevenue(tr?.revenue || 0);
      setMonthRevenue(mr?.revenue || 0);
      setTodayProfit(tp?.profit || 0);
      setMonthProfit(mp?.profit || 0);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    }
  }, [shopId]);

  useMountFetch(fetchData, [fetchData]);

  useEffect(() => {
    function onRevenueUpdated() {
      fetchData();
    }

    window.addEventListener("revenue:updated", onRevenueUpdated);
    return () => window.removeEventListener("revenue:updated", onRevenueUpdated);
  }, [fetchData]);

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      <Box style={{ background: "#faf7f2" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          Today
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {formatCurrency(todayRevenue)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Profit</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: todayProfit >= 0 ? "#047857" : "#b91c1c"
              }}
            >
              {formatCurrency(todayProfit)}
            </div>
          </div>
        </div>
      </Box>

      <Box style={{ background: "#f8fafc" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          This Month
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {formatCurrency(monthRevenue)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Profit</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: monthProfit >= 0 ? "#047857" : "#b91c1c"
              }}
            >
              {formatCurrency(monthProfit)}
            </div>
          </div>
        </div>
      </Box>

      <Box style={{ background: "#eff6ff" }}>
        <div style={{ fontSize: 13, color: "#475569" }}>
          The frontend uses weighted-average costing for finalization checks and profit
          estimation. Stock additions and reductions remain a Supabase concern.
        </div>
      </Box>
    </>
  );
}

export default RevenueProfit;
