import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useRole } from "../../context/useRole";
import { formatCurrency } from "../../lib/format";
import { PAYMENT_MODES, DEBTOR_CATEGORIES } from "../../lib/appConfig";
import { searchProducts } from "../../lib/searchProducts";
import { useMountFetch } from "../../lib/useMountFetch";

function NewSlip({ editSlipId = null, onDone = null }) {
  const { shopId, can } = useRole();
  const canSeePricing = can("managePricing");
  const [slipName, setSlipName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [debtorCategory, setDebtorCategory] = useState("OUTSIDER");
  const [items, setItems] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const productId = selectedProduct?.id || "";
  const [productPickerKey, setProductPickerKey] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [presetPrice, setPresetPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingSlip, setLoadingSlip] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editSlipId);
  const total = items.reduce((sum, item) => sum + item.line_total, 0);

  const [offcuts, setOffcuts] = useState([]);

  const handleProductSearch = useCallback((term) => searchProducts(shopId, term), [shopId]);

  const fetchOffcuts = useCallback(async (pid) => {
    const { data } = await supabase
      .from("wire_offcuts")
      .select("id, remaining_length")
      .eq("shop_id", shopId)
      .eq("product_id", pid)
      .order("remaining_length");

    setOffcuts(data || []);
  }, [shopId]);

  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, gst_number")
      .eq("shop_id", shopId)
      .order("name");

    setCustomers(data || []);
  }, [shopId]);

  const fetchSlip = useCallback(async () => {
    if (!editSlipId) return;

    setLoadingSlip(true);
    setError("");

    const { data: slip, error: slipError } = await supabase
      .from("sales")
      .select("id, slip_name, slip_status, slip_type, customer_phone, customer_id, payment_mode, debtor_category, customers(gst_number)")
      .eq("id", editSlipId)
      .eq("shop_id", shopId)
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
      .select("id, product_id, product_name, quantity, selling_price, line_total, discount_percent")
      .eq("slip_id", editSlipId)
      .order("id");

    setLoadingSlip(false);

    if (itemsError) {
      setError(itemsError.message);
      return;
    }

    setSlipName(slip.slip_name || "");
    setCustomerPhone(slip.customer_phone || "");
    setGstNumber(slip.customers?.gst_number || "");
    setSelectedCustomerId(slip.customer_id || "");
    setPaymentMode(slip.payment_mode || "CASH");
    setDebtorCategory(slip.debtor_category || "OUTSIDER");
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
  }, [editSlipId, shopId]);

  useMountFetch(() => {
    fetchCustomers();
    fetchSlip();
  }, [fetchCustomers, fetchSlip]);

  function applyCustomer(match) {
    if (!match) return;
    setSelectedCustomerId(match.id);
    setSlipName(match.name);
    setCustomerPhone(match.phone || "");
    setGstNumber(match.gst_number || "");
  }

  function selectCustomer(customerId) {
    if (!customerId) {
      setSelectedCustomerId("");
      setSlipName("");
      setCustomerPhone("");
      setGstNumber("");
      return;
    }

    applyCustomer(customers.find((entry) => entry.id === customerId));
  }

  function matchCustomerOnBlur(field, value) {
    const trimmed = value.trim();
    if (!trimmed) return;

    const match = customers.find((entry) =>
      field === "name" ? entry.name === trimmed : entry[field] === trimmed
    );
    if (match) applyCustomer(match);
  }

  const fetchPricing = useCallback(async (pid) => {
    setPricingLoading(true);
    const { data, error: pricingError } = await supabase.rpc("product_pricing_preview", {
      p_product_id: pid,
      p_shop_id: shopId
    });
    setPricingLoading(false);

    if (pricingError || !data?.[0]) return;

    const row = data[0];
    const preset = Number(row.preset_price || 0);
    setPresetPrice(preset);
    setCostPrice(row.purchase_price == null ? null : Number(row.purchase_price));
    setRate(preset ? String(preset) : "");
  }, [shopId]);

  useEffect(() => {
    if (!productId) {
      setPresetPrice(0);
      setCostPrice(null);
      setOffcuts([]);
      return;
    }
    fetchPricing(productId);

    if (selectedProduct?.bundle_length) {
      fetchOffcuts(productId);
    } else {
      setOffcuts([]);
    }
  }, [productId, fetchPricing, fetchOffcuts, selectedProduct]);

  function resetForm() {
    setSlipName("");
    setCustomerPhone("");
    setGstNumber("");
    setSelectedCustomerId("");
    setPaymentMode("CASH");
    setDebtorCategory("OUTSIDER");
    setItems([]);
    setSelectedProduct(null);
    setProductPickerKey((key) => key + 1);
    setQuantity("");
    setRate("");
  }

  function addItem() {
    setError("");

    if (!productId || Number(quantity) <= 0 || Number(rate) <= 0) {
      setError("Fill all fields correctly");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: productId,
        product_name: selectedProduct?.label || "Unknown Product",
        quantity: Number(quantity),
        selling_price: Number(rate),
        line_total: Number(quantity) * Number(rate)
      }
    ]);

    setSelectedProduct(null);
    setProductPickerKey((key) => key + 1);
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

    if (paymentMode === "CREDIT" && (!slipName.trim() || !customerPhone.trim())) {
      setError("Credit sales require a customer name and phone number");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: saveError } = await supabase.rpc("save_slip_draft", {
        p_slip_id: editSlipId,
        p_shop_id: shopId,
        p_slip_name: slipName || null,
        p_customer_phone: customerPhone || null,
        p_payment_mode: paymentMode,
        p_debtor_category: paymentMode === "CREDIT" ? debtorCategory : null,
        p_gst_number: gstNumber || null,
        p_items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          selling_price: item.selling_price,
          line_total: item.line_total,
          discount_percent: 0
        }))
      });

      if (saveError) throw saveError;

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
        <select
          value={selectedCustomerId}
          onChange={(event) => selectCustomer(event.target.value)}
          style={inputStyle}
          disabled={loadingSlip}
        >
          <option value="">New customer (search by typing a name)</option>
          {customers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="Name"
            value={slipName}
            onChange={(event) => {
              setSlipName(event.target.value);
              setSelectedCustomerId("");
            }}
            onBlur={(event) => matchCustomerOnBlur("name", event.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            disabled={loadingSlip}
          />

          <input
            placeholder="Phone number"
            value={customerPhone}
            onChange={(event) => {
              setCustomerPhone(event.target.value);
              setSelectedCustomerId("");
            }}
            onBlur={(event) => matchCustomerOnBlur("phone", event.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            disabled={loadingSlip}
          />
        </div>

        <input
          placeholder="GST number (optional)"
          value={gstNumber}
          onChange={(event) => {
            setGstNumber(event.target.value.toUpperCase());
            setSelectedCustomerId("");
          }}
          onBlur={(event) => matchCustomerOnBlur("gst_number", event.target.value.toUpperCase())}
          style={inputStyle}
          disabled={loadingSlip}
        />

        <SearchableSelect
          key={productPickerKey}
          placeholder="Search product..."
          onSearch={handleProductSearch}
          onSelect={(option) => setSelectedProduct(option)}
          disabled={loadingSlip}
        />

        {productId && (
          <Box style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            {pricingLoading ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>Loading price...</div>
            ) : (
              <>
                {canSeePricing && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: "#475569",
                      marginBottom: 4
                    }}
                  >
                    <span>Purchase Price</span>
                    <strong>{formatCurrency(costPrice || 0)}</strong>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "#475569",
                    marginBottom: 4
                  }}
                >
                  <span>Sale Price</span>
                  <strong>{formatCurrency(presetPrice)}</strong>
                </div>
              </>
            )}
          </Box>
        )}

        {offcuts.length > 0 && (
          <Box style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Already-cut pieces available
            </div>
            <div style={{ fontSize: 13, color: "#78350f" }}>
              {offcuts.map((entry) => `${Number(entry.remaining_length)}m`).join(", ")}
            </div>
          </Box>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            disabled={loadingSlip}
          />

          <select
            value={paymentMode}
            onChange={(event) => setPaymentMode(event.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            disabled={loadingSlip}
          >
            {Object.entries(PAYMENT_MODES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {paymentMode === "CREDIT" && (
          <>
            <div style={{ fontSize: 12, color: "#9a3412", marginTop: -4, marginBottom: 10 }}>
              Credit sale — this bill will appear on the Dashboard's Credit tab once sold, with name + phone as the customer record.
            </div>

            <select
              value={debtorCategory}
              onChange={(event) => setDebtorCategory(event.target.value)}
              style={inputStyle}
              disabled={loadingSlip}
            >
              {Object.entries(DEBTOR_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}

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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div>{formatCurrency(item.line_total)}</div>
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
