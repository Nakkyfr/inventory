import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Pages/dashboard/Dashboard";
import InventoryIn from "./Pages/inventory/InventoryIn";
import Sales from "./Pages/sales/Sales";
import Returns from "./Pages/returns/Returns";
import BottomNav from "./components/navigation/BottomNav";
import { useRole } from "./context/useRole";

function Restricted({ allow, children }) {
  if (!allow) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 90px" }}>
        <h2 style={{ marginTop: 0 }}>Restricted</h2>
        <p style={{ color: "#64748b" }}>
          Your current role does not allow access to this module.
        </p>
      </div>
    );
  }

  return children;
}

function App() {
  const { can } = useRole();

  return (
    <HashRouter>
      <div style={{ paddingBottom: 70 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/sales" />} />

          <Route
            path="/dashboard/*"
            element={<Restricted allow={can("dashboard")}><Dashboard /></Restricted>}
          />
          <Route
            path="/inventory/*"
            element={<Restricted allow={can("inventory")}><InventoryIn /></Restricted>}
          />
          <Route
            path="/sales/*"
            element={<Restricted allow={can("sales")}><Sales /></Restricted>}
          />
          <Route
            path="/returns/*"
            element={<Restricted allow={can("returns")}><Returns /></Restricted>}
          />
        </Routes>
      </div>

      <BottomNav />
    </HashRouter>
  );
}

export default App;
