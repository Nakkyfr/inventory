import { useCallback, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";
import { useRole } from "../../context/useRole";
import { useMountFetch } from "../../lib/useMountFetch";
import { fetchVocabulary } from "../../lib/productVocabulary";
import {
  buildBaseName, buildProductName, unknownTokens, SLOT_ORDER
} from "../../lib/productNaming";

const SLOT_LABELS = {
  size: "Size / rating",
  type: "Product type",
  spec: "Spec",
  pack: "Pack / coil",
  brand: "Brand",
  series: "Series"
};

const SLOT_HINTS = {
  size: "1.5MM², 6AMP, 18W",
  type: "WIRE, SWITCH, PLATE",
  spec: "FRLS, 1WAY, MODULAR",
  pack: "90MTR, 300MTR",
  brand: "POLYCAB, HAVELLS",
  series: "ETIRA, ROMA"
};

const EMPTY = { size: "", type: "", spec: "", pack: "", brand: "", series: "" };

function AddProduct() {
  const { shopId } = useRole();
  const [slots, setSlots] = useState(EMPTY);
  const [colors, setColors] = useState([]);
  const [unit, setUnit] = useState("Piece");
  const [bundleLength, setBundleLength] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [vocab, setVocab] = useState({ colors: [], units: [], bundleLengths: [], tokens: new Set(), names: new Set() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadVocab = useCallback(async () => {
    const v = await fetchVocabulary(shopId);
    setVocab(v);
    if (v.units.length && !v.units.includes(unit)) setUnit(v.units[0]);
  }, [shopId, unit]);

  useMountFetch(loadVocab, [loadVocab]);

  const baseName = buildBaseName(slots);
  const names = colors.length
    ? colors.map((c) => buildProductName(baseName, c))
    : [buildProductName(baseName, null)];

  const unknown = baseName ? unknownTokens(baseName, vocab) : [];
  const clashes = names.filter((n) => vocab.names.has(n.toUpperCase()));

  function setSlot(key, value) {
    setSlots((prev) => ({ ...prev, [key]: value }));
    setMessage("");
    setError("");
  }

  function toggleColor(c) {
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setMessage("");
  }

  async function save() {
    setError("");
    setMessage("");

    if (!baseName) {
      setError("Fill at least one part of the name");
      return;
    }
    if (!slots.type.trim()) {
      setError("Product type is required — it decides where the item sorts");
      return;
    }
    if (clashes.length) {
      setError(`Already in the catalogue: ${clashes.join(", ")}`);
      return;
    }

    const rows = (colors.length ? colors : [null]).map((color) => ({
      shop_id: shopId,
      product_name: buildProductName(baseName, color),
      base_name: baseName,
      color,
      unit,
      bundle_length: bundleLength === "" ? null : Number(bundleLength),
      list_price: listPrice === "" ? null : Number(listPrice),
      sale_discount_percent: discountPercent === "" ? 0 : Number(discountPercent),
      is_active: true
    }));

    setSaving(true);
    const { error: insertError } = await supabase.from("master_products").insert(rows);
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage(
      rows.length > 1
        ? `Added ${rows.length} colour variants of ${baseName}.`
        : `Added ${rows[0].product_name}.`
    );
    setSlots(EMPTY);
    setColors([]);
    setBundleLength("");
    setListPrice("");
    setDiscountPercent("0");
    loadVocab();
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 10,
    fontSize: 15,
    background: "#ffffff"
  };

  const chipStyle = (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
    background: active ? "#e6f0fa" : "#ffffff",
    fontSize: 13,
    cursor: "pointer"
  });

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
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>New Product</div>

        {SLOT_ORDER.map((key) => (
          <input
            key={key}
            type="text"
            placeholder={`${SLOT_LABELS[key]} — e.g. ${SLOT_HINTS[key]}`}
            value={slots[key]}
            onChange={(e) => setSlot(key, e.target.value.toUpperCase())}
            style={inputStyle}
          />
        ))}

        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Colours (optional)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {vocab.colors.map((c) => (
            <button key={c} type="button" style={chipStyle(colors.includes(c))} onClick={() => toggleColor(c)}>
              {c}
            </button>
          ))}
        </div>

        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
          {vocab.units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Bundle / coil length in base units (blank if not sold in bundles)"
          value={bundleLength}
          onChange={(e) => setBundleLength(e.target.value)}
          style={inputStyle}
          list="bundle-lengths"
        />
        <datalist id="bundle-lengths">
          {vocab.bundleLengths.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>

        <input
          type="number"
          placeholder={`List price per ${unit}`}
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
      </Box>

      {baseName && (
        <Box style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
            Will be saved as {names.length > 1 ? `${names.length} products` : "1 product"}
          </div>
          {names.slice(0, 8).map((n) => (
            <div key={n} style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{n}</div>
          ))}
          {names.length > 8 && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>+{names.length - 8} more</div>
          )}

          {unknown.length > 0 && (
            <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", borderRadius: 6, padding: 8, marginTop: 8 }}>
              Not seen before: {unknown.join(", ")}. Fine if it is genuinely new — check the spelling first.
            </div>
          )}
          {clashes.length > 0 && (
            <div style={{ fontSize: 12, color: "#991b1b", background: "#fee2e2", borderRadius: 6, padding: 8, marginTop: 8 }}>
              Already exists: {clashes.join(", ")}
            </div>
          )}
        </Box>
      )}

      <button
        onClick={save}
        disabled={saving || !baseName || clashes.length > 0}
        style={{ width: "100%", height: 48 }}
      >
        {saving ? "Saving..." : names.length > 1 ? `Add ${names.length} Products` : "Add Product"}
      </button>
    </>
  );
}

export default AddProduct;
