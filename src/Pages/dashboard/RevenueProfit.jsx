import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";

function RevenueProfit() {
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [monthProfit, setMonthProfit] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();

    function onRevenueUpdated() {
      fetchData();
    }

    window.addEventListener("revenue:updated", onRevenueUpdated);
    return () =>
      window.removeEventListener("revenue:updated", onRevenueUpdated);
  }, []);

  async function fetchData() {
    try {
      setError("");

      const today = new Date().toISOString().slice(0, 10);
      const monthKey = today.slice(0, 7) + "-01";

      // Today revenue
      const { data: tr } = await supabase
        .from("revenue_daily")
        .select("revenue")
        .eq("day", today)
        .single();

      // Month revenue
      const { data: mr } = await supabase
        .from("revenue_monthly")
        .select("revenue")
        .eq("month", monthKey)
        .single();

      // Today profit
      const { data: tp } = await supabase
        .from("profit_daily")
        .select("profit")
        .eq("day", today)
        .single();

      // Month profit
      const { data: mp } = await supabase
        .from("profit_monthly")
        .select("profit")
        .eq("month", monthKey)
        .single();

      setTodayRevenue(tr?.revenue || 0);
      setMonthRevenue(mr?.revenue || 0);
      setTodayProfit(tp?.profit || 0);
      setMonthProfit(mp?.profit || 0);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    }
  }

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      {/* Today */}
      <Box style={{ background: "#faf7f2" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          Today
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              ₹{todayRevenue}
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
              ₹{todayProfit}
            </div>
          </div>
        </div>
      </Box>

      {/* This Month */}
      <Box style={{ background: "#f8fafc" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          This Month
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              ₹{monthRevenue}
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
              ₹{monthProfit}
            </div>
          </div>
        </div>
      </Box>
    </>
  );
}

export default RevenueProfit;
