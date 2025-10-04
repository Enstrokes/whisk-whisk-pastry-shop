import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { motion } from 'framer-motion';
import { Invoice, PaymentStatus, OrderType, Customer, StockItem, StockCategory } from '../types';
import { SearchIcon, EditIcon, DeleteIcon } from '../components/Icons';
import ViewEyeIcon from '../components/ViewEyeIcon';
import Modal from '../components/Modal';
import InvoiceForm from '../components/InvoiceForm';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

const statusColors: { [key in PaymentStatus]: string } = {
  [PaymentStatus.Paid]: 'bg-green-500/20 text-green-400',
  [PaymentStatus.Pending]: 'bg-yellow-500/20 text-yellow-400',
};

const newInvoiceTemplate: Omit<Invoice, 'id'> = {
  customerId: '',
  customerName: '',
  invoiceNumber: '',
  date: new Date().toISOString().split('T')[0],
  items: [],
  subtotal: 0,
  discount: 0,
  gst: 0,
  total: 0,
  paymentStatus: PaymentStatus.Pending,
  orderType: OrderType.Takeaway,
  notes: '',
  amountPaid: 0,
};

const Billing: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | Omit<Invoice, 'id'> | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const { token } = useAuth();
  const PAGE_SIZE = 10;

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const skip = (page - 1) * PAGE_SIZE;
      const [invoicesRes, customersRes, stockRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/api/invoices?skip=${skip}&limit=${PAGE_SIZE}`, { headers }),
        fetchWithAuth(`${API_URL}/api/customers`, { headers }),
        fetch(`${API_URL}/api/stock_items_public?limit=1000`),
      ]);

      const invoicesData = await invoicesRes.json();
      const customersData = await customersRes.json();
      const stockDataRaw = await stockRes.json();
      const stockData = (stockDataRaw.results || []).map((item: any) => ({ 
        ...item, 
        id: item._id ? String(item._id) : item.id 
      }));

      let rawInvoices = Array.isArray(invoicesData.results)
        ? invoicesData.results
        : Array.isArray(invoicesData)
          ? invoicesData
          : [];
      const normalizedInvoices: Invoice[] = rawInvoices.map((inv: any) => ({
        ...inv,
        id: inv._id ?? inv.id,
        items: inv.items ?? [],
      }));
      setTotal(invoicesData.total || normalizedInvoices.length);

      let rawCustomers = Array.isArray(customersData.results)
        ? customersData.results
        : Array.isArray(customersData)
          ? customersData
          : [];
      const normalizedCustomers: Customer[] = rawCustomers.map((c: any) => ({
        ...c,
        id: c._id ?? c.id,
      }));

      setInvoices(normalizedInvoices);
      setCustomers(normalizedCustomers);
      setAvailableProducts(stockData.filter((item: StockItem) => item.category === StockCategory.FinishedProduct));
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token, page, fetchAllData]);

  const calculateInvoiceTotals = (invoice: Invoice | Omit<Invoice, 'id'>) => {
    const subtotal = invoice.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discountAmount = invoice.items.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount / 100)), 0);
    const gstAmount = invoice.items.reduce((acc, item) => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = itemTotal * (item.discount / 100);
      return acc + ((itemTotal - itemDiscount) * (item.gst / 100));
    }, 0);
    const total = subtotal - discountAmount + gstAmount;
    return { subtotal, total };
  };

  const handleSaveInvoice = async (savedInvoiceData: Invoice | Omit<Invoice, 'id'>) => {
    try {
      const isUpdate = 'id' in savedInvoiceData && savedInvoiceData.id;
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate 
        ? `${API_URL}/api/invoices/${savedInvoiceData.id}` 
        : `${API_URL}/api/invoices`;

      const { subtotal, total } = calculateInvoiceTotals(savedInvoiceData);

      const payload = {
        ...savedInvoiceData,
        subtotal: Number(subtotal),
        total: Number(total),
        amountPaid: Number(savedInvoiceData.amountPaid || 0),
      };

      const response = await fetchWithAuth(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save invoice");
      await fetchAllData();
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setIsModalOpen(false);
      setEditingInvoice(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        const response = await fetchWithAuth(`${API_URL}/api/invoices/${invoiceId}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (!response.ok) throw new Error("Failed to delete invoice");
        await fetchAllData();
      } catch (error) {
        console.error("Failed to delete invoice:", error);
      }
    }
  };

  const handleView = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingInvoice(newInvoiceTemplate);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const filteredInvoices = useMemo(() => {
    if (invoices.length === 1) return invoices;
    return invoices
      .filter(invoice => 
        (statusFilter === 'all' || invoice.paymentStatus === statusFilter) &&
        (typeFilter === 'all' || invoice.orderType === typeFilter)
      )
      .filter(invoice => 
        (invoice.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (loading) return <div className="text-center p-10">Loading Invoices...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-brand-text">Billing</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
        <div className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 bg-brand-surface border border-brand-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PaymentStatus | 'all')} className="bg-brand-surface border border-brand-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary w-full sm:w-auto">
            <option value="all">All Statuses</option>
            {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as OrderType | 'all')} className="bg-brand-surface border border-brand-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary w-full sm:w-auto">
            <option value="all">All Types</option>
            {Object.values(OrderType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={handleOpenCreateModal} className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto">
            Create Invoice
          </button>
        </div>
      </div>
      <div className="bg-brand-sidebar border border-brand-border rounded-xl shadow-lg">
        {/* Desktop Table View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-brand-surface">
              <tr>
                <th className="p-4 font-semibold">Invoice ID</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, index) => (
                <motion.tr 
                  key={invoice.id}
                  className="border-t border-brand-border hover:bg-brand-surface"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                >
                  <td className="p-4 text-brand-accent font-mono">{invoice.invoiceNumber || `...${invoice.id?.slice(-6)}`}</td>
                  <td className="p-4">{invoice.customerName}</td>
                  <td className="p-4 text-brand-text-secondary">{invoice.date}</td>
                  <td className="p-4 font-medium">₹{invoice.total.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.paymentStatus]}`}>
                      {invoice.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleView(invoice)} className="p-2 text-brand-text-secondary hover:text-brand-accent" aria-label="View"><ViewEyeIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenEditModal(invoice)} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit"><EditIcon className="w-5 h-5" /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 divide-y divide-brand-border">
            {filteredInvoices.map((invoice, index) => (
              <motion.div 
                key={invoice.id} 
                className="p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-brand-accent font-mono font-semibold">...{invoice.id?.slice(-6)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.paymentStatus]}`}>
                    {invoice.paymentStatus}
                  </span>
                </div>
                <p className="font-semibold">{invoice.customerName}</p>
                <p className="text-sm text-brand-text-secondary">{invoice.date}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">₹{invoice.total.toFixed(2)}</span>
                  <div>
                    <button onClick={() => handleView(invoice)} className="p-2 text-brand-text-secondary hover:text-brand-accent" aria-label="View"><ViewEyeIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenEditModal(invoice)} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit"><EditIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={!canPrev}
        >Previous</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
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
          disabled={!canNext}
        >Next</button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'view' ? 'View Invoice' : editingInvoice && 'id' in editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
        size="6xl"
      >
            <InvoiceForm
              invoice={editingInvoice ?? newInvoiceTemplate}
              customers={customers}
              products={availableProducts}
              onSave={handleSaveInvoice}
              onCancel={() => setIsModalOpen(false)}
              readOnly={modalMode === 'view'}
            />
      </Modal>

      {filteredInvoices.map(invoice => (
        <div key={`print-${invoice.id}`} id={`print-invoice-${invoice.id}`} className="hidden">
          {/* You can add a print-friendly InvoicePrint component here if needed */}
        </div>
      ))}
    </div>
  );
};

export default Billing;