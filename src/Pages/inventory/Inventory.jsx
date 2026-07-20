import { useState } from "react";
import Page from "../../components/layout/Page";
import InventoryIn from "./InventoryIn";
import ProductPricing from "./ProductPricing";
import { useRole } from "../../context/useRole";

function Inventory() {
  const { can } = useRole();
  const [tab, setTab] = useState("add");

  const tabStyle = (active) => ({
    flex: 1,
    padding: 14,
    border: "none",
    borderRadius: 10,
    background: active ? "#e6f0fa" : "#f2f2f2",
    color: "#111827",
    fontSize: 15,
    fontWeight: active ? 600 : 500,
    cursor: "pointer"
  });

  return (
    <Page title="Inventory">
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button style={tabStyle(tab === "add")} onClick={() => setTab("add")}>
          Add Inventory
        </button>

        {can("manageProductPricing") && (
          <button style={tabStyle(tab === "pricing")} onClick={() => setTab("pricing")}>
            Pricing
          </button>
        )}
      </div>

      {tab === "add" && <InventoryIn />}
      {tab === "pricing" && can("manageProductPricing") && <ProductPricing />}
    </Page>
  );
}

export default Inventory;
