import { useState } from 'react';
import Dashboard from './Pages/Dashboard.jsx';
import InventoryEntry from './Pages/InventoryEntry.jsx';
import SalesEntry from './Pages/SalesEntry.jsx';

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
