import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Page from "../../components/layout/Page";
import Box from "../../components/ui/Box";

const SHOP_ID = "00000000-0000-0000-0000-000000000001";

function InventoryIn() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchEntries();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("master_products")
      .select("product_id, product_name")
      .eq("is_active", true)
      .order("product_name");

    setProducts(data || []);
  }

  async function fetchEntries() {
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("inventory_in")
      .select(`
        id,
        quantity,
        purchase_price,
        created_at,
        master_products ( product_name )
      `)
      .gte("created_at", today)
      .order("created_at", { ascending: false });

    setEntries(data || []);
  }

  async function addInventory() {
    setError("");

    if (!productId || Number(quantity) <= 0 || Number(price) <= 0) {
      setError("Fill all fields correctly");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("inventory_in").insert([
      {
        shop_id: SHOP_ID,
        product_id: productId,
        quantity: Number(quantity),
        remaining_quantity: Number(quantity),
        purchase_price: Number(price)
      }
    ]);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setProductId("");
      setQuantity("");
      setPrice("");
      fetchEntries();
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 12,
    fontSize: 15,
    background: "#ffffff"
  };

  const actionButtonStyle = {
    width: "100%",
    height: 48,
    borderRadius: 8,
    border: "none",
    background: "#e6f0fa", // ✅ POWDER BLUE
    color: "#1f2937",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    opacity: loading ? 0.6 : 1
  };

  return (
    <Page title="Inventory In">
      {error && (
        <Box
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa"
          }}
        >
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      {/* Add Inventory */}
      <Box style={{ background: "#faf7f2" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
          Add Inventory
        </div>

        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select product</option>
          {products.map(p => (
            <option key={p.product_id} value={p.product_id}>
              {p.product_name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Purchase price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={addInventory}
          disabled={loading}
          style={actionButtonStyle}
        >
          {loading ? "Adding…" : "Add Inventory"}
        </button>
      </Box>

      {/* Today Entries */}
      <Box style={{ background: "#f8fafc" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
          Today
        </div>

        {entries.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            No inventory added today
          </p>
        )}

        {entries.map(e => (
          <div
            key={e.id}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid #e5e7eb"
            }}
          >
            <div style={{ fontWeight: 500 }}>
              {e.master_products.product_name}
            </div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              {e.quantity} × ₹{e.purchase_price}
            </div>
          </div>
        ))}
      </Box>
    </Page>
  );
}

export default InventoryIn;
