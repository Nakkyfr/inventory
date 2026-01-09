import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [stockCount, setStockCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      // Owner summary (today + month)
      const { data: summaryData } = await supabase
        .from('owner_summary_view')
        .select('*')
        .single();

      // Total stock count
      const { data: stockData } = await supabase
        .from('stock_view')
        .select('current_stock');

      let totalStock = 0;
      if (stockData) {
        stockData.forEach((row) => {
          totalStock += Number(row.current_stock);
        });
      }

      setSummary(summaryData);
      setStockCount(totalStock);
    }

    fetchData();
  }, []);

  if (!summary) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1>Owner Dashboard</h1>

      <h3>Today</h3>
      <p>Sales: ₹{summary.today_sales || 0}</p>
      <p>Profit: ₹{summary.today_profit || 0}</p>

      <h3>Month</h3>
      <p>Sales: ₹{summary.month_sales || 0}</p>
      <p>Profit: ₹{summary.month_profit || 0}</p>

      <h3>Inventory</h3>
      <p>Total Units in Stock: {stockCount}</p>
    </div>
  );
}

export default Dashboard;
