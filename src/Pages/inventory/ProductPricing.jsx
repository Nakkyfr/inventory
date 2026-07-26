import { useCallback, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useRole } from "../../context/useRole";
import { searchProducts } from "../../lib/searchProducts";
import { formatCurrency } from "../../lib/format";
import { unitChoices, unitFactor, priceToBase, defaultUnit, rescalePrice } from "../../lib/units";
import { splitColor, colorSiblings } from "../../lib/productVariants";

function ProductPricing() {
  const { shopId, can } = useRole();
  const canSeePricing = can("managePricing");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productId = selectedProduct?.id || "";
  const [entryUnit, setEntryUnit] = useState("base");
  const [listPrice, setListPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [costPrice, setCostPrice] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [applyToAllColors, setApplyToAllColors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleProductSearch = useCallback((term) => searchProducts(shopId, term), [shopId]);

  const productUnits = unitChoices(selectedProduct);
  const entryFactor = unitFactor(selectedProduct, entryUnit);
  const entryUnitLabel = productUnits.find((c) => c.value === entryUnit)?.label;

  const listPriceBase = priceToBase(listPrice, entryFactor);

  const salePrice =
    Math.round(listPriceBase * (1 - Number(discountPercent || 0) / 100) * 100) / 100;

  function selectProduct(option) {
    setSelectedProduct(option);
    setMessage("");
    setError("");

    const unit = defaultUnit(option);
    const factor = unitFactor(option, unit);
    setEntryUnit(unit);
    setListPrice(option.list_price != null ? rescalePrice(String(option.list_price), 1, factor) : "");
    setDiscountPercent(option.sale_discount_percent != null ? String(option.sale_discount_percent) : "0");

    setCostPrice(null);
    supabase
      .rpc("product_pricing_preview", { p_product_id: option.id, p_shop_id: shopId })
      .then(({ data }) => {
        const row = data?.[0];
        setCostPrice(row?.purchase_price == null ? null : Number(row.purchase_price));
      });

    setSiblings([]);
    setApplyToAllColors(false);
    const { base } = splitColor(option.label);
    if (base) {
      searchProducts(shopId, base).then((results) => {
        const found = colorSiblings(option, results).filter((p) => p.id !== option.id);
        setSiblings(found);
      });
    }
  }

  async function savePricing() {
    setError("");
    setMessage("");

    if (!productId) {
      setError("Select a product first");
      return;
    }

    const targets = applyToAllColors ? [selectedProduct, ...siblings] : [selectedProduct];

    setSaving(true);

    const results = await Promise.all(
      targets.map((target) =>
        supabase.rpc("update_product_pricing", {
          p_product_id: target.id,
          p_shop_id: shopId,
          p_list_price: listPrice === "" ? null : listPriceBase,
          p_sale_discount_percent: discountPercent === "" ? 0 : Number(discountPercent)
        })
      )
    );
    setSaving(false);

    const failed = results.filter((r) => r.error);
    if (failed.length) {

      setError(
        failed.length === targets.length
          ? failed[0].error.message
          : `${targets.length - failed.length} of ${targets.length} updated. Failed: ${failed[0].error.message}`
      );
      return;
    }

    setMessage(
      targets.length > 1 ? `Pricing updated for ${targets.length} colours.` : "Pricing updated."
    );
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

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}
      {message && (
        <Box style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}>
          <p style={{ color: "#155e75", margin: 0 }}>{message}</p>
        </Box>
      )}

      <Box style={{ background: "#faf7f2" }}>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
          List Price &amp; Discount
        </div>

        <SearchableSelect
          placeholder="Search product..."
          onSearch={handleProductSearch}
          onSelect={selectProduct}
        />

        {productId && (
          <>
            {productUnits.length > 1 && (
              <select
                value={entryUnit}
                onChange={(e) => {
                  const next = e.target.value;
                  setListPrice((prev) =>
                    rescalePrice(prev, entryFactor, unitFactor(selectedProduct, next))
                  );
                  setEntryUnit(next);
                }}
                style={inputStyle}
              >
                {productUnits.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    Enter price per {choice.label}
                  </option>
                ))}
              </select>
            )}

            <input
              type="number"
              placeholder={entryUnitLabel ? `List price per ${entryUnitLabel}` : "List price"}
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Sale discount % off list price"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              style={inputStyle}
            />
            <Box style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>

              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                Per {selectedProduct?.unit || "unit"}
              </div>
              {[
                canSeePricing && ["Purchase Price", costPrice],
                ["List Price", listPriceBase],
                ["Sale Price", salePrice]
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: "#475569",
                      marginBottom: 4
                    }}
                  >
                    <span>{label}</span>
                    <strong>{value == null ? "—" : formatCurrency(value)}</strong>
                  </div>
                ))}
            </Box>

            {siblings.length > 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 13,
                  color: "#475569",
                  marginBottom: 12
                }}
              >
                <input
                  type="checkbox"
                  checked={applyToAllColors}
                  onChange={(e) => setApplyToAllColors(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  Apply to all {siblings.length + 1} colours of this product
                  <div style={{ color: "#6b7280", marginTop: 2 }}>
                    {[splitColor(selectedProduct.label).color, ...siblings.map((s) => splitColor(s.label).color)]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </span>
              </label>
            )}

            <button onClick={savePricing} disabled={saving} style={{ width: "100%", height: 48 }}>
              {saving
                ? "Saving..."
                : applyToAllColors
                ? `Save Pricing (${siblings.length + 1} colours)`
                : "Save Pricing"}
            </button>
          </>
        )}
      </Box>
    </>
  );
}

export default ProductPricing;
