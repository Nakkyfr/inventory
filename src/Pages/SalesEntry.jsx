import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function SalesEntry() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('master_products')
        .select('product_id, product_name')
        .eq('is_active', true);

      if (data) {
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
    if (Number(price) <= 0) {
      setErrorMsg('Selling price must be greater than 0');
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc('process_fifo_sale', {
      p_product_id: productId,
      p_quantity: Number(quantity),
      p_selling_price: Number(price),
      p_payment_mode: paymentMode
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setProductId('');
      setQuantity('');
      setPrice('');
      setPaymentMode('cash');
      alert('Sale recorded');
    }
  };

  return (
    <div>
      <h1>Sales Entry</h1>

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

      <label>Selling Price (per unit)</label>
      <br />
      <input
        type="number"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <br /><br />

      <label>Payment Mode</label>
      <br />
      <select
        value={paymentMode}
        onChange={(e) => setPaymentMode(e.target.value)}
      >
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="credit">Credit</option>
      </select>

      <br /><br />

      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Sale'}
      </button>
    </div>
  );
}

export default SalesEntry;
