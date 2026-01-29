import { useState } from "react";
import Page from "../../components/layout/Page";
import RevenueProfit from "./RevenueProfit";
import StockSummary from "./StockSummary";

function Dashboard() {
  const [tab, setTab] = useState("cash");

  const tabBtn = (active) => ({
    flex: 1,
    padding: 14,
    border: "none",
    background: active ? "#e0ecf8" : "#f3f4f6",
    color: "#111827",
    fontSize: 15,
    fontWeight: active ? 600 : 500,
    borderRadius: 8,
    cursor: "pointer"
  });

  return (
    <Page title="Dashboard">
      {/* Toggle Buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16
        }}
      >
        <button
          style={tabBtn(tab === "cash")}
          onClick={() => setTab("cash")}
        >
          Cash Flow
        </button>

        <button
          style={tabBtn(tab === "stock")}
          onClick={() => setTab("stock")}
        >
          Stock Summary
        </button>
      </div>

      {/* Content */}
      {tab === "cash" && <RevenueProfit />}
      {tab === "stock" && <StockSummary />}
    </Page>
  );
}

export default Dashboard;
