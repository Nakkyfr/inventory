import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";

const SHOP_ID = "00000000-0000-0000-0000-000000000001";

function NewReturnSlip() {
  const [products, setProducts] = useState([]);
  const [slipName, setSlipName] = useState("");
  const [items, setItems] = useState([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = items.reduce((s, i) => s + i.line_total, 0);

  useEffect(() => {
    supabase
      .from("master_products")
      .select("product_id, product_name")
      .eq("is_active", true)
      .order("product_name")
      .then(({ data }) => setProducts(data || []));
  }, []);

  function resetForm() {
    setSlipName("");
    setItems([]);
    setProductId("");
    setQuantity("");
    setRate("");
  }

  function addItem() {
    setError("");

    if (!productId || Number(quantity) <= 0 || Number(rate) <= 0) {
      setError("Fill all fields correctly");
      return;
    }

    const p = products.find(x => x.product_id === productId);

    setItems(prev => [
      ...prev,
      {
        product_id: productId,
        product_name: p.product_name,
        quantity: Number(quantity),
        selling_price: Number(rate),
        line_total: Number(quantity) * Number(rate)
      }
    ]);

    setProductId("");
    setQuantity("");
    setRate("");
  }

  async function saveReturn() {
    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: slip, error: slipError } = await supabase
        .from("sales")
        .insert([
          {
            shop_id: SHOP_ID,
            slip_type: "RETURN",
            slip_status: "DRAFT",
            slip_name: slipName || null,
            total_amount: total
          }
        ])
        .select()
        .single();

      if (slipError) throw slipError;

      const { error: itemsError } = await supabase
        .from("sales_slip_items")
        .insert(
          items.map(i => ({
            slip_id: slip.id,
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            selling_price: i.selling_price,
            line_total: i.line_total
          }))
        );

      if (itemsError) throw itemsError;

      resetForm();
    } catch (err) {
      setError(err.message || "Failed to save return");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 10,
    fontSize: 14,
    background: "#ffffff",
    boxSizing: "border-box" // ✅ KEY FIX
  };

  const actionButton = {
    width: "100%",
    height: 44,
    borderRadius: 8,
    border: "none",
    background: "#e6f0fa",
    color: "#1f2937",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    opacity: saving ? 0.6 : 1
  };

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      <Box style={{ background: "#faf7f2" }}>
        <input
          placeholder="Return slip name (optional)"
          value={slipName}
          onChange={e => setSlipName(e.target.value)}
          style={inputStyle}
        />

        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
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
          onChange={e => setQuantity(e.target.value)}
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Rate"
          value={rate}
          onChange={e => setRate(e.target.value)}
          style={inputStyle}
        />

        <button onClick={addItem} style={actionButton}>
          Add Item
        </button>
      </Box>

      {items.map((i, idx) => (
        <Box key={idx} style={{ background: "#f8fafc" }}>
          <div style={{ fontWeight: 500 }}>{i.product_name}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {i.quantity} × ₹{i.selling_price}
          </div>
        </Box>
      ))}

      <Box style={{ background: "#f8fafc" }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>₹{total}</div>
      </Box>

      <button onClick={saveReturn} disabled={saving} style={actionButton}>
        {saving ? "Saving…" : "Save Return"}
      </button>
    </>
  );
}

export default NewReturnSlip;
