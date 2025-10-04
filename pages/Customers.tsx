
import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { Customer, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';
type EventFilter = 'all' | 'birthday' | 'anniversary';




const PAGE_SIZE = 10;

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { token } = useAuth();


  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Pagination params
        const skip = (page - 1) * PAGE_SIZE;
        const url = `${API_URL}/api/customers?skip=${skip}&limit=${PAGE_SIZE}`;
        const [customersRes, invoicesRes] = await Promise.all([
          fetchWithAuth(url, token),
          fetchWithAuth(`${API_URL}/api/invoices`, token),
        ]);
        const customersData = await customersRes.json();
        setCustomers(customersData.results);
        setTotal(customersData.total);
        setInvoices(await invoicesRes.json());
      } catch (err) {
        // Optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [token, page]);

  function formatEventDate(dateStr: string | undefined): string {
    const d = getNextEventDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getNextEventDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const today = new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    let eventDate = new Date(today.getFullYear(), month - 1, day);
    if (eventDate < today) {
      eventDate = new Date(today.getFullYear() + 1, month - 1, day);
    }
    return eventDate;
  }

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return customers
      .filter(c =>
        c.name.toLowerCase().includes(search) ||
        (c.phone && c.phone.toLowerCase().includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search))
      )
      .filter(c => {
        if (eventFilter === 'all') return true;
        if (eventFilter === 'birthday') return !!c.birthday;
        if (eventFilter === 'anniversary') return !!c.anniversary;
        return true;
      });
  }, [customers, searchTerm, eventFilter]);


  if (loading) return <div className="text-center p-10">Loading Customers...</div>;

  // Pagination controls
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-brand-primary">Customer List</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-center">
        <div className="flex-1">
          <div className="relative w-full max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </span>
            <input
              type="text"
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              placeholder="Search by name, phone, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap md:flex-nowrap justify-end">
          <select
            className="rounded-lg border border-gray-200 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-w-[140px] text-sm"
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value as EventFilter)}
          >
            <option value="all">All Events</option>
            <option value="birthday">Has Birthday</option>
            <option value="anniversary">Has Anniversary</option>
          </select>
        </div>
      </div>
  <div className="bg-white rounded-xl shadow p-4">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-brand-surface">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Birthday</th>
                <th className="p-4 font-semibold">Anniversary</th>
                <th className="p-4 font-semibold">Address</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-brand-text-secondary">No customers found.</td></tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-brand-border hover:bg-brand-surface">
                  <td className="p-4 font-semibold">{customer.name}</td>
                  <td className="p-4">{customer.phone}</td>
                  <td className="p-4">{customer.email}</td>
                  <td className="p-4">{customer.birthday}</td>
                  <td className="p-4">{customer.anniversary || '-'}</td>
                  <td className="p-4">{customer.address}</td>
                  <td className="p-4 text-right">
                    <button
                      className="px-3 py-1 rounded bg-brand-primary text-white hover:bg-brand-primary/80"
                      onClick={() => setSelectedCustomer(customer)}
                    >View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 divide-y divide-brand-border">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{customer.name}</span>
                </div>
                <p className="font-semibold">{customer.phone}</p>
                <p className="text-sm text-brand-text-secondary">{customer.email}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">{customer.address}</span>
                  <button
                    className="px-3 py-1 rounded bg-brand-primary text-white hover:bg-brand-primary/80"
                    onClick={() => setSelectedCustomer(customer)}
                  >View Details</button>
                </div>
              </div>
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
      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-brand-border w-full max-w-xl relative">
            <button
              className="absolute top-2 right-2 text-brand-text-secondary hover:text-brand-primary"
              onClick={() => setSelectedCustomer(null)}
            >✕</button>
            <h2 className="text-xl font-bold text-brand-primary mb-1">{selectedCustomer.name}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-brand-text-secondary mb-2">
              <span><strong>Phone:</strong> {selectedCustomer.phone}</span>
              {selectedCustomer.email && <span><strong>Email:</strong> {selectedCustomer.email}</span>}
            </div>
            <div className="mb-2 text-sm text-brand-text-secondary">
              <strong>Address:</strong> {selectedCustomer.address || <span className="text-brand-text-secondary/50">Not provided</span>}
            </div>
            <div className="flex gap-4 text-sm text-brand-text-secondary mb-2">
              <span><strong>Birthday:</strong> {formatEventDate(selectedCustomer.birthday) || <span className="text-brand-text-secondary/50">Not provided</span>}</span>
              <span><strong>Anniversary:</strong> {selectedCustomer.anniversary ? formatEventDate(selectedCustomer.anniversary) : <span className="text-brand-text-secondary/50">Not provided</span>}</span>
            </div>
            <h3 className="text-lg font-semibold mt-6 mb-2">Order History</h3>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {invoices.filter(inv => inv.customerId === selectedCustomer.id).length > 0 ? invoices.filter(inv => inv.customerId === selectedCustomer.id).map(order => (
                <li key={order.id} className="flex justify-between p-2 rounded bg-brand-surface">
                  <span>#{order.id?.slice(-6)} on {new Date(order.date).toLocaleDateString()}</span>
                  <span className="font-medium">₹{order.total.toFixed(2)}</span>
                </li>
              )) : <p className="text-brand-text-secondary">No orders found.</p>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
