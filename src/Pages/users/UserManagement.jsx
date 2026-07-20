import { useCallback, useState } from "react";
import Page from "../../components/layout/Page";
import Box from "../../components/ui/Box";
import { supabase } from "../../supabaseClient";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";

const ADD_ROLE_OPTIONS = [
  { value: "owner", label: "Owner (new shop)" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" }
];

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxSizing: "border-box"
};

function UserManagement() {
  const { masterInviteToShop, createShopOwner, authError } = useRole();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [addRole, setAddRole] = useState("owner");

  const [shopName, setShopName] = useState("");
  const [shopOwnerEmail, setShopOwnerEmail] = useState("");
  const [shopOwnerName, setShopOwnerName] = useState("");

  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchShops = useCallback(async () => {
    const { data, error: fetchError } = await supabase.rpc("master_list_shops");
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setShops(data || []);
    setSelectedShopId((current) => current || data?.[0]?.shop_id || "");
  }, []);

  useMountFetch(fetchShops, [fetchShops]);

  async function handleCreateShop(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await createShopOwner({ shopName, ownerEmail: shopOwnerEmail, ownerName: shopOwnerName });
      setShopName("");
      setShopOwnerEmail("");
      setShopOwnerName("");
      setMessage("Shop created and owner invite sent.");
    } catch (err) {
      void err;
    }
  }

  async function handleInviteToShop(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedShopId) {
      setError("Select a shop to add this user to.");
      return;
    }

    setSaving(true);
    try {
      await masterInviteToShop({
        shopId: selectedShopId,
        email: inviteEmail,
        role: addRole,
        phone: invitePhone,
        name: inviteName
      });
      setInviteEmail("");
      setInvitePhone("");
      setInviteName("");
      setMessage(`Invite sent by email as ${addRole}.`);
    } catch (err) {
      void err;
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title="User Management">
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ margin: 0, color: "#9a3412" }}>{error}</p>
        </Box>
      )}
      {authError && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ margin: 0, color: "#9a3412" }}>{authError}</p>
        </Box>
      )}
      {message && (
        <Box style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}>
          <p style={{ margin: 0, color: "#155e75" }}>{message}</p>
        </Box>
      )}

      <Box style={{ background: "#eff6ff" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Add User</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
          Choose a role. Owner creates a brand new shop. Manager/Staff are added
          to an existing shop.
        </div>

        <select
          value={addRole}
          onChange={(event) => setAddRole(event.target.value)}
          style={inputStyle}
        >
          {ADD_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {addRole === "owner" ? (
          <form onSubmit={handleCreateShop}>
            <input
              type="text"
              required
              value={shopName}
              onChange={(event) => setShopName(event.target.value)}
              placeholder="Shop name"
              style={inputStyle}
            />
            <input
              type="email"
              required
              value={shopOwnerEmail}
              onChange={(event) => setShopOwnerEmail(event.target.value)}
              placeholder="Owner email"
              style={inputStyle}
            />
            <input
              type="text"
              value={shopOwnerName}
              onChange={(event) => setShopOwnerName(event.target.value)}
              placeholder="Owner name (optional)"
              style={inputStyle}
            />
            <button type="submit" style={{ width: "100%", height: 40 }}>
              Create Shop + Invite Owner
            </button>
          </form>
        ) : (
          <form onSubmit={handleInviteToShop}>
            <select
              required
              value={selectedShopId}
              onChange={(event) => setSelectedShopId(event.target.value)}
              style={inputStyle}
            >
              <option value="">Select shop owner</option>
              {shops.map((shop) => (
                <option key={shop.shop_id} value={shop.shop_id}>
                  {shop.owner_display_name || shop.owner_email} ({shop.shop_name})
                </option>
              ))}
            </select>
            {shops.length === 0 && (
              <div style={{ fontSize: 13, color: "#9a3412", marginBottom: 10 }}>
                No shops with an accepted owner yet — add an owner first.
              </div>
            )}
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={`${addRole}@company.com`}
              style={inputStyle}
            />
            <input
              type="text"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Name (optional)"
              style={inputStyle}
            />
            <input
              type="tel"
              value={invitePhone}
              onChange={(event) => setInvitePhone(event.target.value)}
              placeholder="Phone number (optional)"
              style={inputStyle}
            />
            <button type="submit" disabled={saving} style={{ width: "100%", height: 40 }}>
              {saving ? "Sending..." : `Invite as ${addRole === "manager" ? "Manager" : "Staff"}`}
            </button>
          </form>
        )}
      </Box>
    </Page>
  );
}

export default UserManagement;
