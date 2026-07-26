import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useRole } from "../../context/useRole";
import { formatCurrency } from "../../lib/format";
import { searchProducts } from "../../lib/searchProducts";
import { useMountFetch } from "../../lib/useMountFetch";
import {
  unitChoices, unitFactor, quantityToBase, priceToBase, defaultUnit, rescalePrice
} from "../../lib/units";

const INPUT_MODES = {
  LIST_DISCOUNT: "Discount % off list price",
  UNIT_PRICE: "Unit price",
  TOTAL_PRICE: "Total price for this batch"
};

function InventoryIn() {
  const { shopId, can } = useRole();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productId = selectedProduct?.id || "";
  const [productPickerKey, setProductPickerKey] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [entryUnit, setEntryUnit] = useState("base");
  const [inputMode, setInputMode] = useState("UNIT_PRICE");
  const [inputValue, setInputValue] = useState("");
  const [resolvedPrice, setResolvedPrice] = useState(null);
  const [pricingError, setPricingError] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProductSearch = useCallback((term) => searchProducts(shopId, term), [shopId]);

  const productUnits = unitChoices(selectedProduct);
  const entryFactor = unitFactor(selectedProduct, entryUnit);
  const entryUnitLabel = productUnits.find((c) => c.value === entryUnit)?.label;

  const baseQuantity = quantityToBase(quantity, entryFactor);
  const baseInputValue =
    inputMode === "UNIT_PRICE" ? priceToBase(inputValue, entryFactor) : Number(inputValue || 0);

  const fetchEntries = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("inventory_in")
      .select("id, quantity, purchase_price, created_by, created_at, master_products ( product_name )")
      .eq("shop_id", shopId)
      .gte("created_at", today)
      .order("created_at", { ascending: false });
    setEntries(data || []);
  }, [shopId]);

  useMountFetch(fetchEntries, [fetchEntries]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!productId || !(Number(quantity) > 0) || !(Number(inputValue) >= 0)) {
        if (!cancelled) {
          setResolvedPrice(null);
          setPricingError("");
        }
        return;
      }

      const { data, error: previewError } = await supabase.rpc("preview_inventory_purchase_price", {
        p_shop_id: shopId,
        p_product_id: productId,
        p_quantity: baseQuantity,
        p_input_mode: inputMode,
        p_input_value: baseInputValue
      });

      if (cancelled) return;
      if (previewError) {
        setResolvedPrice(null);
        setPricingError(previewError.message);
        return;
      }
      setPricingError("");
      setResolvedPrice(Number(data));
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [shopId, productId, quantity, inputMode, inputValue, baseQuantity, baseInputValue]);

  async function addInventory() {
    setError("");
    if (!productId || !(Number(quantity) > 0) || !(Number(inputValue) >= 0)) {
      setError("Fill all fields correctly");
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase.rpc("record_inventory_in", {
      p_shop_id: shopId,
      p_product_id: productId,
      p_quantity: baseQuantity,
      p_input_mode: inputMode,
      p_input_value: baseInputValue
    });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSelectedProduct(null);
    setProductPickerKey((key) => key + 1);
    setQuantity("");
    setEntryUnit("base");
    setInputValue("");
    setResolvedPrice(null);
    fetchEntries();
  }

  function handleProductChange(option) {
    setSelectedProduct(option);
    setEntryUnit(defaultUnit(option));
  }

  function handleUnitChange(next) {

    if (inputMode === "UNIT_PRICE") {
      setInputValue((prev) => rescalePrice(prev, entryFactor, unitFactor(selectedProduct, next)));
    }
    setEntryUnit(next);
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

  const valuePlaceholder =
    inputMode === "LIST_DISCOUNT"
      ? "Discount % (e.g. 12)"
      : inputMode === "TOTAL_PRICE"
      ? "Total price for this batch"
      : entryUnitLabel
      ? `Unit price (per ${entryUnitLabel})`
      : "Unit price";

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      <Box style={{ background: "#faf7f2" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>Add Inventory</div>
        <SearchableSelect
          key={productPickerKey}
          placeholder="Search product..."
          onSearch={handleProductSearch}
          onSelect={handleProductChange}
        />
        {productUnits.length > 1 && (
          <select value={entryUnit} onChange={(e) => handleUnitChange(e.target.value)} style={inputStyle}>
            {productUnits.map((choice) => (
              <option key={choice.value} value={choice.value}>
                Enter in {choice.label}
              </option>
            ))}
          </select>
        )}
        <input
          type="number"
          placeholder={entryUnitLabel ? `Quantity (${entryUnitLabel})` : "Quantity"}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={inputStyle}
        />
        <select value={inputMode} onChange={(e) => setInputMode(e.target.value)} style={inputStyle}>
          {Object.entries(INPUT_MODES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder={valuePlaceholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={inputStyle}
        />

        {pricingError && (
          <div style={{ fontSize: 13, color: "#9a3412", marginTop: -6, marginBottom: 12 }}>
            {pricingError}
          </div>
        )}
        {resolvedPrice != null && !pricingError && (
          <div style={{ fontSize: 13, color: "#475569", marginTop: -6, marginBottom: 12 }}>
            &asymp; {formatCurrency(resolvedPrice)} / {selectedProduct?.unit || "unit"}
            {entryFactor > 1 && <> &middot; {baseQuantity} {selectedProduct?.unit} recorded</>}
            {" "}&middot; {formatCurrency(resolvedPrice * baseQuantity)} total
          </div>
        )}

        <button onClick={addInventory} disabled={loading} style={{ width: "100%", height: 48 }}>
          {loading ? "Adding..." : "Add Inventory"}
        </button>
      </Box>

      <Box style={{ background: "#f8fafc" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>Today</div>
        {entries.length === 0 && <p style={{ color: "#6b7280", fontSize: 14 }}>No inventory added today</p>}
        {entries.map((e) => (
          <div key={e.id} style={{ padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 500 }}>{e.master_products?.product_name || "Unknown Product"}</div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              {e.quantity} x Rs.{e.purchase_price}
            </div>
            {can("viewAudit") && (
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {e.created_by ? `By: ${e.created_by.slice(0, 8)}` : "By: unknown"}
              </div>
            )}
          </div>
        ))}
      </Box>
    </>
  );
}

export default InventoryIn;
