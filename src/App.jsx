import { useState } from 'react';
import InventoryEntry from './pages/InventoryEntry';
import SalesEntry from './pages/SalesEntry';
import Dashboard from './Pages/Dashboard';

function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="app-container">
      <div className="nav">
        <button
          className={page === 'dashboard' ? 'active' : ''}
          onClick={() => setPage('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={page === 'inventory' ? 'active' : ''}
          onClick={() => setPage('inventory')}
        >
          Inventory
        </button>
        <button
          className={page === 'sales' ? 'active' : ''}
          onClick={() => setPage('sales')}
        >
          Sales
        </button>
      </div>

      {page === 'dashboard' && <Dashboard />}
      {page === 'inventory' && <InventoryEntry />}
      {page === 'sales' && <SalesEntry />}
    </div>
  );
}

export default App;
