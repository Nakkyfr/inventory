import { useState } from "react";
import Page from "../../components/layout/Page";
import NewReturnSlip from "./NewReturnSlip";
import ReturnSlipsList from "./ReturnSlipsList";

function Returns() {
  const [tab, setTab] = useState("new");

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
    <Page title="Returns">
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button
          style={tabStyle(tab === "new")}
          onClick={() => setTab("new")}
        >
          New Return
        </button>

        <button
          style={tabStyle(tab === "saved")}
          onClick={() => setTab("saved")}
        >
          Saved Returns
        </button>
      </div>

      {tab === "new" && <NewReturnSlip />}
      {tab === "saved" && <ReturnSlipsList />}
    </Page>
  );
}

export default Returns;
