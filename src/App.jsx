import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./Pages/dashboard/Dashboard";
import InventoryIn from "./Pages/inventory/InventoryIn";
import Sales from "./Pages/sales/Sales";
import Returns from "./Pages/returns/Returns";
import BottomNav from "./components/navigation/BottomNav";

function App() {
  return (
    <HashRouter>
      <div style={{ paddingBottom: 70 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/sales" />} />

          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/inventory/*" element={<InventoryIn />} />
          <Route path="/sales/*" element={<Sales />} />
          <Route path="/returns/*" element={<Returns />} />
        </Routes>
      </div>

      <BottomNav />
    </HashRouter>
  );
}

export default App;
