import { useNavigate, useLocation } from "react-router-dom";
import { useRole } from "../../context/useRole";

function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { can } = useRole();

  const btn = path => ({
    flex: 1,
    padding: 12,
    border: "none",
    background: loc.pathname.startsWith(path) ? "#dbeafe" : "#f8fafc",
    color: "#0f172a"
  });

  const items = [
    can("dashboard") && { path: "/dashboard", label: "Home" },
    can("inventory") && { path: "/inventory", label: "Inventory" },
    can("sales") && { path: "/sales", label: "Sales" },
    can("returns") && { path: "/returns", label: "Returns" }
  ].filter(Boolean);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        borderTop: "1px solid #cbd5e1",
        background: "#ffffff"
      }}
    >
      {items.map((item) => (
        <button
          key={item.path}
          style={btn(item.path)}
          onClick={() => nav(item.path)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default BottomNav;
