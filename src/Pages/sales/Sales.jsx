import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Page from "../../components/layout/Page";
import NewSlip from "./NewSlip";
import SlipsList from "./SlipsList";
import SlipAudit from "../../components/slips/SlipAudit";
import { useRole } from "../../context/useRole";

function Sales() {
  const { can } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = location.pathname.includes("/edit/");
  const editSlipId = isEdit ? location.pathname.split("/edit/")[1] : null;

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
    <Page title="Sales">
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

          {can("viewAudit") && (
            <button
              style={tabStyle(tab === "audit")}
              onClick={() => setTab("audit")}
            >
              Audit
            </button>
          )}
        </div>
      )}

      {!isEdit && tab === "new" && <NewSlip />}
      {!isEdit && tab === "saved" && <SlipsList />}
      {!isEdit && tab === "audit" && can("viewAudit") && (
        <SlipAudit title="Sales Audit" />
      )}

      {isEdit && (
        <NewSlip
          editSlipId={editSlipId}
          onDone={() => navigate("/sales")}
        />
      )}
    </Page>
  );
}

export default Sales;
