import { ROLES } from "../../lib/appConfig";
import { useRole } from "../../context/useRole";

function Page({ title, children, actions }) {
  const { role, setRole, signOut, isMaster, availableShops, activeShopId, setActiveShop } =
    useRole();

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "16px 16px 90px"
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              Signed in as {ROLES[role]}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {actions}
            {isMaster && availableShops.length > 0 && (
              <select
                value={activeShopId || availableShops[0]?.shop_id || ""}
                onChange={(event) => setActiveShop(event.target.value)}
                style={{
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  padding: "8px 10px",
                  background: "#ffffff"
                }}
              >
                {availableShops.map((shop) => (
                  <option key={shop.shop_id} value={shop.shop_id}>
                    {shop.shop_name}
                  </option>
                ))}
              </select>
            )}
            {isMaster && (
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                style={{
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  padding: "8px 10px",
                  background: "#ffffff"
                }}
              >
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={signOut}
              style={{
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                padding: "8px 10px",
                background: "#ffffff",
                color: "#0f172a"
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export default Page;
