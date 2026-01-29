import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import Box from "../../components/ui/Box";

const SHOP_ID = "00000000-0000-0000-0000-000000000001";

function SlipsList() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSlips();
  }, []);

  async function fetchSlips() {
    const { data, error } = await supabase
      .from("sales")
      .select("id, slip_name, total_amount, created_at")
      .eq("shop_id", SHOP_ID)
      .eq("slip_type", "SALE")
      .eq("slip_status", "DRAFT")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setSlips(data || []);
    }
  }

  async function markSold(id) {
    if (!window.confirm("Mark this slip as sold?")) return;

    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("sales")
      .update({
        slip_status: "SOLD",
        completed_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("slip_status", "DRAFT");

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSlips(prev => prev.filter(s => s.id !== id));

    // 🔔 Notify dashboard
    window.dispatchEvent(new Event("revenue:updated"));
  }

  async function deleteSlip(id) {
    if (!window.confirm("Delete this slip?")) return;

    setLoading(true);
    setError("");

    await supabase.from("sales_slip_items").delete().eq("slip_id", id);
    await supabase.from("sales").delete().eq("id", id);

    setLoading(false);
    setSlips(prev => prev.filter(s => s.id !== id));
  }

  const primaryButton = {
    width: "100%",
    height: 40,
    borderRadius: 8,
    border: "none",
    background: "#e6f0fa",
    color: "#1f2937",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 8
  };

  const dangerButton = {
    ...primaryButton,
    background: "#fef2f2",
    color: "#991b1b"
  };

  return (
    <>
      {error && (
        <Box style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p style={{ color: "#9a3412", margin: 0 }}>{error}</p>
        </Box>
      )}

      {slips.length === 0 && (
        <Box style={{ background: "#f8fafc" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>
            No saved sale slips
          </p>
        </Box>
      )}

      {slips.map(s => (
        <Box key={s.id} style={{ background: "#faf7f2" }}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>
              {s.slip_name || "Untitled Slip"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              ₹{s.total_amount} ·{" "}
              {new Date(s.created_at).toLocaleString()}
            </div>
          </div>

          <button
            style={primaryButton}
            disabled={loading}
            onClick={() => markSold(s.id)}
          >
            Mark Sold
          </button>

          <button
            style={dangerButton}
            disabled={loading}
            onClick={() => deleteSlip(s.id)}
          >
            Delete Slip
          </button>
        </Box>
      ))}
    </>
  );
}

export default SlipsList;
