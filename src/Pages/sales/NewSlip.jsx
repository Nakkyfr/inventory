import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { SHOP_ID } from "../../lib/appConfig";
import { formatCurrency } from "../../lib/format";

function NewSlip({ editSlipId = null, onDone = null }) {
  const [products, setProducts] = useState([]);
  const [slipName, setSlipName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingSlip, setLoadingSlip] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editSlipId);
  const total = items.reduce((sum, item) => sum + item.line_total, 0);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from("master_products")
      .select("product_id, product_name")
      .eq("is_active", true)
      .order("product_name");

    setProducts(data || []);
  }, []);

  const fetchSlip = useCallback(async () => {
    if (!editSlipId) return;

    setLoadingSlip(true);
    setError("");

    const { data: slip, error: slipError } = await supabase
      .from("sales")
      .select("id, slip_name, slip_status, slip_type, customer_phone")
      .eq("id", editSlipId)
      .eq("shop_id", SHOP_ID)
      .eq("slip_type", "SALE")
      .single();

    if (slipError) {
      setLoadingSlip(false);
      setError(slipError.message);
      return;
    }

    if (slip.slip_status !== "DRAFT") {
      setLoadingSlip(false);
      setError("Only draft slips can be edited.");
      return;
    }

    const { data: lineItems, error: itemsError } = await supabase
      .from("sales_slip_items")
      .select("id, product_id, product_name, quantity, selling_price, line_total")
      .eq("slip_id", editSlipId)
      .order("id");

    setLoadingSlip(false);

    if (itemsError) {
      setError(itemsError.message);
      return;
    }

    setSlipName(slip.slip_name || "");
    setCustomerPhone(slip.customer_phone || "");
    setItems(
      (lineItems || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: Number(item.quantity || 0),
        selling_price: Number(item.selling_price || 0),
        line_total: Number(item.line_total || 0)
      }))
    );
  }, [editSlipId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProducts();
      fetchSlip();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchProducts, fetchSlip]);

  function resetForm() {
    setSlipName("");
    setCustomerPhone("");
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

    const product = products.find((entry) => entry.product_id === productId);

    setItems((prev) => [
      ...prev,
      {
        product_id: productId,
        product_name: product?.product_name || "Unknown Product",
        quantity: Number(quantity),
        selling_price: Number(rate),
        line_total: Number(quantity) * Number(rate)
      }
    ]);

    setProductId("");
    setQuantity("");
    setRate("");
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveSlip() {
    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let slipId = editSlipId;
      const salesPayload = {
        slip_name: slipName || null,
        total_amount: total,
        customer_phone: customerPhone || null,
        payment_status: "UNPAID"
      };

      if (isEditing) {
        const { error: slipUpdateError } = await supabase
          .from("sales")
          .update(salesPayload)
          .eq("id", editSlipId)
          .eq("shop_id", SHOP_ID)
          .eq("slip_type", "SALE")
          .eq("slip_status", "DRAFT");

        if (slipUpdateError) throw slipUpdateError;

        const { error: deleteItemsError } = await supabase
          .from("sales_slip_items")
          .delete()
          .eq("slip_id", editSlipId);

        if (deleteItemsError) throw deleteItemsError;
      } else {
        const { data: slip, error: slipInsertError } = await supabase
          .from("sales")
          .insert([
            {
              shop_id: SHOP_ID,
              slip_type: "SALE",
              slip_status: "DRAFT",
              ...salesPayload
            }
          ])
          .select()
          .single();

        if (slipInsertError) throw slipInsertError;
        slipId = slip.id;
      }

      const { error: itemsError } = await supabase
        .from("sales_slip_items")
        .insert(
          items.map((item) => ({
            slip_id: slipId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            selling_price: item.selling_price,
            line_total: item.line_total
          }))
        );

      if (itemsError) throw itemsError;

      resetForm();
      if (onDone) onDone();
    } catch (err) {
      setError(err.message || "Failed to save slip");
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
    boxSizing: "border-box"
  };

  const primaryButton = {
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

  const secondaryButton = {
    ...primaryButton,
    background: "#f8fafc",
    border: "1px solid #cbd5e1"
  };

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      {isEditing && (
        <Box style={{ background: "#eff6ff" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Editing draft slip</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Update the draft, then save to overwrite its current line items.
          </div>
        </Box>
      )}

      <Box style={{ background: "#faf7f2" }}>
        <input
          placeholder="Name"
          value={slipName}
          onChange={(event) => setSlipName(event.target.value)}
          style={inputStyle}
          disabled={loadingSlip}
        />

        <input
          placeholder="Phone number"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          style={inputStyle}
          disabled={loadingSlip}
        />

        <select
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          style={inputStyle}
          disabled={loadingSlip}
        >
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.product_id} value={product.product_id}>
              {product.product_name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          style={inputStyle}
          disabled={loadingSlip}
        />

        <input
          type="number"
          placeholder="Rate"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          style={inputStyle}
          disabled={loadingSlip}
        />

        <button onClick={addItem} style={primaryButton} disabled={loadingSlip}>
          Add Item
        </button>
      </Box>

      {items.map((item, index) => (
        <Box key={item.id || `${item.product_id}-${index}`} style={{ background: "#f8fafc" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{item.product_name}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {item.quantity} x {formatCurrency(item.selling_price)}
              </div>
            </div>
            <button
              onClick={() => removeItem(index)}
              style={{
                border: "none",
                borderRadius: 8,
                background: "#fef2f2",
                color: "#991b1b",
                padding: "8px 10px"
              }}
            >
              Remove
            </button>
          </div>
        </Box>
      ))}

      <Box style={{ background: "#f8fafc" }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{formatCurrency(total)}</div>
      </Box>

      <button onClick={saveSlip} disabled={saving || loadingSlip} style={primaryButton}>
        {saving ? "Saving..." : isEditing ? "Update Slip" : "Save Slip"}
      </button>

      {isEditing && onDone && (
        <button onClick={onDone} disabled={saving} style={secondaryButton}>
          Cancel
        </button>
      )}
    </>
  );
}

export default NewSlip;