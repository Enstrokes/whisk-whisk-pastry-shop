import { fetchWithAuth } from '../utils/fetchWithAuth';
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { StockItem, StockStatus, StockCategory } from '../types';
import Modal from '../components/Modal';
import StockForm from '../components/StockForm';
import AdjustStockForm from '../components/AdjustStockForm';
import { EditIcon, DeleteIcon, PlusIcon, AdjustIcon } from '../components/Icons';
import { SearchIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

const getStockStatus = (item: StockItem): StockStatus => {
  if (item.quantity <= 0) return StockStatus.OutOfStock;
  if (item.quantity <= item.lowStockThreshold) return StockStatus.LowStock;
  return StockStatus.InStock;
};

const statusColors: { [key in StockStatus]: { bg: string; text: string; pie: string } } = {
  [StockStatus.InStock]: { bg: 'bg-green-500/20', text: 'text-green-400', pie: '#2A9D8F' },
  [StockStatus.LowStock]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', pie: '#F4A261' },
  [StockStatus.OutOfStock]: { bg: 'bg-red-500/20', text: 'text-red-400', pie: '#E76F51' },
};

const newStockItemTemplate: Omit<StockItem, 'id'> = {
  name: '',
  category: StockCategory.Ingredient,
  quantity: 0,
  unit: 'pcs',
  costPerUnit: 0,
  lowStockThreshold: 0,
};

const StockManagement: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isAdjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | Omit<StockItem, 'id'> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<StockCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;
  const { token } = useAuth();

  useEffect(() => {
    const fetchStock = async () => {
      try {
        setLoading(true);
        const skip = (page - 1) * PAGE_SIZE;
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(PAGE_SIZE),
          search: searchTerm,
          category: categoryFilter !== 'all' ? categoryFilter : '',
          status: statusFilter !== 'all' ? statusFilter : '',
        });
        const url = `${API_URL}/api/stock_items?${params.toString()}`;
        const response = await fetchWithAuth(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        // Support both array and paginated object
        let items = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setTotal(data.total || items.length);
        // Map _id to id for frontend consistency
        const mapped = items.map((item: any) => ({ ...item, id: item._id || item.id }));
        setStock(mapped);
      } catch (error) {
        console.error("Failed to fetch stock items:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchStock();
    }
  }, [token, page, searchTerm, categoryFilter, statusFilter]);

  const filteredStock = stock; // Now handled by backend

  const stockStatusData = useMemo(() => {
    const counts = {
      [StockStatus.InStock]: 0,
      [StockStatus.LowStock]: 0,
      [StockStatus.OutOfStock]: 0,
    };
    stock.forEach(item => {
      counts[getStockStatus(item)]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [stock]);

  const handleOpenCreateModal = () => {
    setSelectedItem(newStockItemTemplate);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (item: StockItem) => {
    setSelectedItem(item);
    setFormModalOpen(true);
  };

  const handleOpenAdjustModal = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustModalOpen(true);
  };
  
  const handleDeleteItem = async (itemId: string) => {
    console.log('[StockManagement] handleDeleteItem called with id:', itemId);
    if (!itemId) {
      alert('Cannot delete: id is undefined!');
      return;
    }
    if (window.confirm('Are you sure you want to delete this stock item?')) {
      try {
  const response = await fetchWithAuth(`${API_URL}/api/stock_items/${itemId}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete stock item');
        setStock(prev => prev.filter(item => item.id !== itemId));
        alert('Stock item deleted successfully.');
      } catch(error) {
        console.error("Failed to delete stock item:", error);
        alert('Failed to delete stock item.');
      }
    }
  };

  // Helper to fetch and map stock items
  const fetchAndSetStock = async () => {
    try {
      setLoading(true);
  const response = await fetchWithAuth(`${API_URL}/api/stock_items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const mapped = data.map((item: any) => ({ ...item, id: item._id || item.id }));
      setStock(mapped);
    } catch (error) {
      console.error("Failed to fetch stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStockItem = async (itemData: StockItem | Omit<StockItem, 'id'>) => {
    console.log('[StockManagement] handleSaveStockItem received:', itemData);
    const isUpdate = 'id' in itemData && itemData.id;
    let url = `${API_URL}/api/stock_items`;
    let method: 'POST' | 'PUT' = 'POST';
    let body = { ...itemData };
    if (isUpdate) {
      url = `${API_URL}/api/stock_items/${itemData.id}`;
      method = 'PUT';
      // Remove id from body for update (MongoDB _id is immutable)
      const { id, ...rest } = itemData as StockItem;
      body = rest;
    }
    console.log('[StockManagement] handleSaveStockItem, method:', method, 'url:', url, 'body:', body);
    try {
  const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if(!response.ok) throw new Error("Failed to save stock item");
      // Always re-fetch the latest stock list after save
      await fetchAndSetStock();
    } catch(error) {
      console.error("Error saving stock item:", error);
    } finally {
      setFormModalOpen(false);
      setSelectedItem(null);
    }
  };

  const handleAdjustStock = async (itemId: string, purchaseData: { quantity_added: number, cost_per_unit_of_purchase: number }) => {
    try {
  const response = await fetchWithAuth(`${API_URL}/api/stock_items/${itemId}/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(purchaseData)
      });
      if(!response.ok) throw new Error("Failed to adjust stock");
      // Always re-fetch the latest stock list after purchase
      await fetchAndSetStock();
    } catch(error) {
        console.error("Error adjusting stock:", error);
    } finally {
      setAdjustModalOpen(false);
      setSelectedItem(null);
    }
  }
  
  if (loading) return <div className="text-center p-10">Loading Stock...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
        <div className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by name, category..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full sm:w-64 bg-brand-surface border border-brand-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value as StockCategory | 'all'); setPage(1); }} className="bg-brand-surface border border-brand-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary w-full sm:w-auto">
            <option value="all">All Categories</option>
            {Object.values(StockCategory).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as StockStatus | 'all'); setPage(1); }} className="bg-brand-surface border border-brand-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary w-full sm:w-auto">
            <option value="all">All Statuses</option>
            {Object.values(StockStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={handleOpenCreateModal} className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto flex items-center gap-2">
            <PlusIcon className="w-5 h-5" /> Create Item
          </button>
        </div>
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-6 mb-2">
        <button
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >Previous</button>
        {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            className={`px-3 py-1 rounded border ${p === page ? 'bg-brand-primary text-white' : 'border-gray-300'}`}
            onClick={() => setPage(p)}
            disabled={p === page}
          >{p}</button>
        ))}
        <button
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
          onClick={() => setPage(page + 1)}
          disabled={page >= Math.ceil(total / PAGE_SIZE)}
        >Next</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-brand-sidebar border border-brand-border rounded-xl shadow-lg">
           {/* Desktop Table View */}
           <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-brand-surface">
                  <tr>
                    <th className="p-4 font-semibold">Item Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Quantity</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item, index) => {
                    const status = getStockStatus(item);
                    return (
                      <motion.tr
                        key={item.id}
                        className="border-t border-brand-border hover:bg-brand-surface"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                      >
                        <td className="p-4 font-medium">{item.name}</td>
                        <td className="p-4 text-brand-text-secondary">{item.category}</td>
                        <td className="p-4">{Number(item.quantity).toFixed(2)} {item.unit}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status].bg} ${statusColors[status].text}`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleOpenAdjustModal(item)} className="p-2 text-brand-text-secondary hover:text-brand-primary" aria-label="Adjust Quantity"><AdjustIcon className="w-5 h-5" /></button>
                          <button onClick={() => handleOpenEditModal(item)} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit"><EditIcon className="w-5 h-5" /></button>
                          <button onClick={() => {
                            console.log('[StockManagement] Delete button clicked, item:', item);
                            if (!item.id) {
                              alert('Cannot delete: item.id is undefined!');
                              return;
                            }
                            handleDeleteItem(item.id);
                          }} className="p-2 text-brand-text-secondary hover:text-red-500" aria-label="Delete"><DeleteIcon className="w-5 h-5" /></button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
           </div>
           {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="grid grid-cols-1 divide-y divide-brand-border">
                {filteredStock.map((item, index) => {
                  const status = getStockStatus(item);
                  return (
                    <motion.div 
                        key={item.id} 
                        className="p-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <p className="font-semibold text-brand-text">{item.name}</p>
                             <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status].bg} ${statusColors[status].text}`}>
                                {status}
                              </span>
                        </div>
                        <p className="text-sm text-brand-text-secondary">{item.category}</p>
                        <div className="flex justify-between items-center mt-2">
                           <p className="text-lg font-bold">{item.quantity} <span className="text-sm font-normal text-brand-text-secondary">{item.unit}</span></p>
                            <div>
                               <button onClick={() => handleOpenAdjustModal(item)} className="p-2 text-brand-text-secondary hover:text-brand-primary" aria-label="Adjust Quantity"><AdjustIcon className="w-5 h-5" /></button>
                              <button onClick={() => handleOpenEditModal(item)} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit"><EditIcon className="w-5 h-5" /></button>
                              <button onClick={() => {
                                console.log('[StockManagement] Delete button clicked, item:', item);
                                if (!item.id) {
                                  alert('Cannot delete: item.id is undefined!');
                                  return;
                                }
                                handleDeleteItem(item.id);
                              }} className="p-2 text-brand-text-secondary hover:text-red-500" aria-label="Delete"><DeleteIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </motion.div>
                  );
                })}
              </div>
           </div>
        </div>
        <div className="bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-brand-text">Stock Status</h2>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={stockStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {stockStatusData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={statusColors[entry.name as StockStatus].pie} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }} itemStyle={{ color: '#1A202C' }} labelStyle={{ color: '#718096' }}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>
       <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={selectedItem && 'id' in selectedItem ? "Edit Stock Item" : "Create Stock Item"}>
        {selectedItem && (
          <StockForm
            initialItem={selectedItem}
            onSave={handleSaveStockItem}
            onCancel={() => setFormModalOpen(false)}
          />
        )}
      </Modal>
      <Modal isOpen={isAdjustModalOpen} onClose={() => setAdjustModalOpen(false)} title={`Record Purchase for ${(selectedItem as StockItem)?.name}`}>
        {selectedItem && 'id' in selectedItem && (
          <AdjustStockForm
            item={selectedItem as StockItem}
            onSave={handleAdjustStock}
            onCancel={() => setAdjustModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default StockManagement;