import { useCallback, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useRole } from "../../context/useRole";
import { searchProducts } from "../../lib/searchProducts";

function ProductPricing() {
  const { shopId } = useRole();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productId = selectedProduct?.id || "";
  const [listPrice, setListPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleProductSearch = useCallback((term) => searchProducts(shopId, term), [shopId]);

  function selectProduct(option) {
    setSelectedProduct(option);
    setMessage("");
    setError("");
    setListPrice(option.list_price != null ? String(option.list_price) : "");
    setDiscountPercent(option.sale_discount_percent != null ? String(option.sale_discount_percent) : "0");
  }

  async function savePricing() {
    setError("");
    setMessage("");

    if (!productId) {
      setError("Select a product first");
      return;
    }

    setSaving(true);
    const { error: rpcError } = await supabase.rpc("update_product_pricing", {
      p_product_id: productId,
      p_shop_id: shopId,
      p_list_price: listPrice === "" ? null : Number(listPrice),
      p_sale_discount_percent: discountPercent === "" ? 0 : Number(discountPercent)
    });
    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage("Pricing updated.");
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
            <input
              type="number"
              placeholder="List price"
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
            <button onClick={savePricing} disabled={saving} style={{ width: "100%", height: 48 }}>
              {saving ? "Saving..." : "Save Pricing"}
            </button>
          </>
        )}
      </Box>
    </>
  );
}

export default ProductPricing;
