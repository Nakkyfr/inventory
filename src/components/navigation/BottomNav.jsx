import { useNavigate, useLocation } from "react-router-dom";

function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();

  const btn = path => ({
    flex: 1,
    padding: 12,
    border: "none",
    background: loc.pathname.startsWith(path) ? "#ddd" : "#f7f7f7"
  });

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        borderTop: "1px solid #ccc"
      }}
    >
      <button style={btn("/dashboard")} onClick={() => nav("/dashboard")}>Home</button>
      <button style={btn("/inventory")} onClick={() => nav("/inventory")}>Inventory</button>
      <button style={btn("/sales")} onClick={() => nav("/sales")}>Sales</button>
      <button style={btn("/returns")} onClick={() => nav("/returns")}>Returns</button>
    </div>
  );
}

export default BottomNav;
