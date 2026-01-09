import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function InventoryEntry() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('master_products')
        .select('product_id, product_name')
        .eq('is_active', true);

      if (!error && data) {
        setProducts(data);
      }
    }

    fetchProducts();
  }, []);

  const handleSave = async () => {
    setErrorMsg('');

    if (!productId) {
      setErrorMsg('Select a product');
      return;
    }
    if (Number(quantity) <= 0) {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }
    if (Number(cost) < 0) {
      setErrorMsg('Cost cannot be negative');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('inventory_in')
      .insert([
        {
          product_id: productId,
          quantity_remaining: Number(quantity),
          unit_cost_price: Number(cost)
        }
      ]);

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setProductId('');
      setQuantity('');
      setCost('');
      alert('Inventory added');
    }
  };

  return (
    <div>
      <h1>Inventory Entry</h1>

      {errorMsg && <p className="error">{errorMsg}</p>}

      <label>Product</label>
      <br />
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
      >
        <option value="">Select product</option>
        {products.map((p) => (
          <option key={p.product_id} value={p.product_id}>
            {p.product_name}
          </option>
        ))}
      </select>

      <br /><br />

      <label>Quantity</label>
      <br />
      <input
        type="number"
        min="0"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      <br /><br />

      <label>Unit Cost Price</label>
      <br />
      <input
        type="number"
        min="0"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
      />

      <br /><br />

      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

export default InventoryEntry;
