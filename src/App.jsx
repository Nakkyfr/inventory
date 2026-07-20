import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Pages/dashboard/Dashboard";
import Inventory from "./Pages/inventory/Inventory";
import Sales from "./Pages/sales/Sales";
import UserManagement from "./Pages/users/UserManagement";
import BottomNav from "./components/navigation/BottomNav";
import { useRole } from "./context/useRole";
import LoginWindow from "./components/auth/LoginWindow";

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
  const { can, session, signIn, loadingAuth, loadingProfile, authError, needsMasterSetup } =
    useRole();

  if (loadingAuth || (session && loadingProfile)) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ color: "#64748b" }}>Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginWindow
        loading={loadingAuth}
        error={authError}
        onLogin={signIn}
      />
    );
  }

  return (
    <HashRouter>
      <div style={{ paddingBottom: 70 }}>
        {needsMasterSetup && (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              padding: "10px 16px",
              fontSize: 13
            }}
          >
            This account matches the configured master email but its profile
            hasn't been set up as master yet. Run the master role migration,
            then reload.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/sales" />} />

          <Route
            path="/dashboard/*"
            element={<Restricted allow={can("dashboard")}><Dashboard /></Restricted>}
          />
          <Route
            path="/inventory/*"
            element={<Restricted allow={can("inventory")}><Inventory /></Restricted>}
          />
          <Route
            path="/sales/*"
            element={<Restricted allow={can("sales")}><Sales /></Restricted>}
          />
          <Route
            path="/users/*"
            element={<Restricted allow={can("manageUsers")}><UserManagement /></Restricted>}
          />

          <Route path="*" element={<Navigate to="/sales" />} />
        </Routes>
      </div>

      <BottomNav />
    </HashRouter>
  );
}

export default App;
