import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Invoice, PaymentStatus, OrderType, Customer, StockItem, StockCategory } from '../types';
import { SearchIcon, EditIcon, DeleteIcon, PrintIcon } from '../components/Icons';
import Modal from '../components/Modal';
import InvoiceForm from '../components/InvoiceForm';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

const statusColors: { [key in PaymentStatus]: string } = {
  [PaymentStatus.Paid]: 'bg-green-500/20 text-green-400',
  [PaymentStatus.Pending]: 'bg-yellow-500/20 text-yellow-400',
  [PaymentStatus.Overdue]: 'bg-red-500/20 text-red-400',
};

const InvoicePrint: React.FC<{ invoice: Invoice | null }> = ({ invoice }) => {
  if (!invoice) return null;
  const discountAmount = invoice.items.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount / 100)), 0);
  const gstAmount = invoice.items.reduce((acc, item) => {
    const itemTotal = item.price * item.quantity;
    const itemDiscount = itemTotal * (item.discount / 100);
    return acc + ((itemTotal - itemDiscount) * (item.gst / 100));
  }, 0);

  return (
    <div className="p-8 font-sans text-gray-800">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-primary">INVOICE</h1>
          <p className="text-gray-500">Invoice ID: {invoice.id}</p>
          <p className="text-gray-500">Date: {invoice.date}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">Whisk & Whisk Pastry Shop</h2>
          <p className="text-gray-500">123 Bakery Lane, Food City</p>
        </div>
      </div>
      <div className="mb-8">
        <h3 className="font-bold border-b pb-2 mb-2">Bill To:</h3>
        <p>{invoice.customerName}</p>
      </div>
      <table className="w-full mb-8">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 text-left">Item</th>
            <th className="p-2 text-center">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Disc.%</th>
            <th className="p-2 text-right">GST%</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map(item => (
            <tr key={item.productId} className="border-b">
              <td className="p-2">{item.productName}</td>
              <td className="p-2 text-center">{item.quantity}</td>
              <td className="p-2 text-right">₹{item.price.toFixed(2)}</td>
              <td className="p-2 text-right">{item.discount}%</td>
              <td className="p-2 text-right">{item.gst}%</td>
              <td className="p-2 text-right">₹{(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-full sm:w-2/5">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>₹{invoice.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Discount:</span><span>-₹{discountAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">GST:</span><span>+₹{gstAmount.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-xl mt-2 border-t pt-2"><span className="text-brand-primary">Grand Total:</span><span className="text-brand-primary">₹{invoice.total.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Amount Paid:</span><span>₹{invoice.amountPaid.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold"><span className="text-gray-600">Balance Due:</span><span>₹{(invoice.total - invoice.amountPaid).toFixed(2)}</span></div>
        </div>
      </div>
      {invoice.notes && <div className="mt-8 pt-4 border-t"><h4 className="font-bold">Notes:</h4><p className="text-gray-600">{invoice.notes}</p></div>}
    </div>
  );
};

const newInvoiceTemplate: Omit<Invoice, 'id'> = {
  customerId: '',
  customerName: '',
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | Omit<Invoice, 'id'> | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };

        const [invoicesRes, customersRes, stockRes] = await Promise.all([
          fetch(`${API_URL}/api/invoices`, { headers }),
          fetch(`${API_URL}/api/customers`, { headers }),
          fetch(`${API_URL}/api/stock_items`, { headers }),
        ]);

        const invoicesData = await invoicesRes.json();
        const customersData = await customersRes.json();
        const stockData: StockItem[] = await stockRes.json();

        const normalizedInvoices: Invoice[] = invoicesData.map((inv: any) => ({
          ...inv,
          id: inv._id ?? inv.id,
          items: inv.items ?? [],
        }));

        setInvoices(normalizedInvoices);
        setCustomers(customersData);
        setAvailableProducts(stockData.filter(item => item.category === StockCategory.FinishedProduct));
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAllData();
    }
  }, [token]);

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

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save invoice");

      const savedInvoice = await response.json();

      const normalizedInvoice: Invoice = {
        ...savedInvoice,
        id: savedInvoice._id ?? savedInvoice.id,
      };

      if (isUpdate) {
        setInvoices(prev => prev.map(inv => inv.id === normalizedInvoice.id ? normalizedInvoice : inv));
      } else {
        setInvoices(prev => [normalizedInvoice, ...prev]);
      }
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
        const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (!response.ok) throw new Error("Failed to delete invoice");
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      } catch (error) {
        console.error("Failed to delete invoice:", error);
      }
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(invoice => 
        (statusFilter === 'all' || invoice.paymentStatus === statusFilter) &&
        (typeFilter === 'all' || invoice.orderType === typeFilter)
      )
      .filter(invoice => 
        (invoice.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [invoices, searchTerm, statusFilter, typeFilter]);

  const handlePrint = (invoice: Invoice) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Invoice</title>');
      printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
      printWindow.document.write('<style>body { -webkit-print-color-adjust: exact; } .text-brand-primary { color: #6B46C1; }</style>');
      printWindow.document.write('</head><body>');
      const invoiceHtml = document.getElementById(`print-invoice-${invoice.id}`)?.innerHTML;
      if(invoiceHtml) printWindow.document.write(invoiceHtml);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 500);
    }
  };

  const handleOpenCreateModal = () => {
    console.log('Setting editingInvoice to:', newInvoiceTemplate);
    setEditingInvoice(newInvoiceTemplate);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

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
                  <td className="p-4 text-brand-accent font-mono">...{invoice.id?.slice(-6)}</td>
                  <td className="p-4">{invoice.customerName}</td>
                  <td className="p-4 text-brand-text-secondary">{invoice.date}</td>
                  <td className="p-4 font-medium">₹{invoice.total.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.paymentStatus]}`}>
                      {invoice.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handlePrint(invoice)} className="p-2 text-brand-text-secondary hover:text-brand-accent" aria-label="Print"><PrintIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenEditModal(invoice)} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit"><EditIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteInvoice(invoice.id!)} className="p-2 text-brand-text-secondary hover:text-red-500" aria-label="Delete"><DeleteIcon className="w-5 h-5" /></button>
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
                    <button onClick={() => handlePrint(invoice)} className="p-2 text-brand-text-secondary hover:text-brand-accent" aria-label="Print"><PrintIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleOpenEditModal(invoice)} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit"><EditIcon className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteInvoice(invoice.id!)} className="p-2 text-brand-text-secondary hover:text-red-500" aria-label="Delete"><DeleteIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <InvoiceForm 
          invoice={editingInvoice ?? newInvoiceTemplate}
          customers={customers}
          products={availableProducts}
          onSave={handleSaveInvoice}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {filteredInvoices.map(invoice => (
        <div key={`print-${invoice.id}`} id={`print-invoice-${invoice.id}`} className="hidden">
          <InvoicePrint invoice={invoice} />
        </div>
      ))}
    </div>
  );
};

export default Billing;