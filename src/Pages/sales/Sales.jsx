import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Page from "../../components/layout/Page";
import NewSlip from "./NewSlip";
import SlipsList from "./SlipsList";

function Sales() {
  const location = useLocation();
  const isEdit = location.pathname.includes("/edit/");

  const [tab, setTab] = useState("new");

  // If we enter edit mode, hide tabs
  useEffect(() => {
    if (isEdit) return;
  }, [isEdit]);

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
    <Page title="Sales">
      {/* Tabs only when NOT editing */}
      {!isEdit && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <button
            style={tabStyle(tab === "new")}
            onClick={() => setTab("new")}
          >
            New Slip
          </button>

          <button
            style={tabStyle(tab === "saved")}
            onClick={() => setTab("saved")}
          >
            Saved Slips
          </button>
        </div>
      )}

      {/* Content */}
      {!isEdit && tab === "new" && <NewSlip />}
      {!isEdit && tab === "saved" && <SlipsList />}

      {/* Edit mode */}
      {isEdit && <NewSlip />}
    </Page>
  );
}

export default Sales;
