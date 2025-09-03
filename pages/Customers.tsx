// Helper to get next occurrence of a date string (YYYY-MM-DD) in current or next year
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
import { fetchWithAuth } from '../utils/fetchWithAuth';
import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Invoice } from '../types';
import { SearchIcon, BirthdayIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

type EventFilter = 'all' | 'birthday' | 'anniversary';


const Customers: React.FC = () => {
  // State and token declarations
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'withOrders' | 'withoutOrders'>('all');
  const { token } = useAuth();

  // Filtered customers based on search, event, and order filters
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const search = searchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(search) ||
          (c.phone && c.phone.includes(search))
        );
      })
      .filter(c => {
        if (eventFilter === 'all') return true;
        if (eventFilter === 'birthday') return !!c.birthday;
        if (eventFilter === 'anniversary') return !!c.anniversary;
        return true;
      })
      .filter(c => {
        if (orderFilter === 'all') return true;
        const orderCount = invoices.filter(inv => inv.customerId === c.id).length;
        if (orderFilter === 'withOrders') return orderCount > 0;
        if (orderFilter === 'withoutOrders') return orderCount === 0;
        return true;
      });
  }, [customers, searchTerm, eventFilter, orderFilter, invoices]);

  useEffect(() => {
    // Fetch customers and invoices from API
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [customersRes, invoicesRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/api/customers`, token),
          fetchWithAuth(`${API_URL}/api/invoices`, token),
        ]);
        setCustomers(await customersRes.json());
        setInvoices(await invoicesRes.json());
      } catch (err) {
        // Optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [token]);
  
  // Helper to format event date for display (always show next occurrence)
  function formatEventDate(dateStr: string | undefined): string {
    const d = getNextEventDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  useEffect(() => {
    // This effect ensures a customer is always selected if the list is not empty,
    // and handles re-selection if the currently selected customer is filtered out.
    if (filteredCustomers.length > 0 && (!selectedCustomer || !filteredCustomers.find(c => c.id === selectedCustomer.id))) {
        setSelectedCustomer(filteredCustomers[0]);
    } else if (filteredCustomers.length === 0) {
        setSelectedCustomer(null);
    }
  }, [filteredCustomers, selectedCustomer]);

  // Get orders for the selected customer by matching customerId
  const customerOrders = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.id) return [];
    return invoices.filter(inv => inv.customerId === selectedCustomer.id);
  }, [selectedCustomer, invoices]);

  const currentMonthEvents = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const events: { name: string, date: string, type: 'Birthday' | 'Anniversary' }[] = [];
    customers.forEach(c => {
      const nextBirthday = getNextEventDate(c.birthday);
      if (nextBirthday && nextBirthday.getMonth() === month && nextBirthday.getFullYear() === year) {
        events.push({ name: c.name, date: nextBirthday.toLocaleDateString(), type: 'Birthday' });
      }
      if (c.anniversary) {
        const nextAnniversary = getNextEventDate(c.anniversary);
        if (nextAnniversary && nextAnniversary.getMonth() === month && nextAnniversary.getFullYear() === year) {
          events.push({ name: c.name, date: nextAnniversary.toLocaleDateString(), type: 'Anniversary' });
        }
      }
    });
    return events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [customers]);
  
  if (loading) return <div className="text-center p-10">Loading Customers...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-brand-text">Customers</h1>
      {/* Top: Upcoming Events */}
      <div className="mb-6">
        <div className="bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <BirthdayIcon className="w-6 h-6 text-brand-accent" />
            Upcoming Birthdays & Anniversaries (This Month)
          </h3>
          <ul className="space-y-2">
            {currentMonthEvents.length === 0 && <li className="text-brand-text-secondary">No events this month.</li>}
            {currentMonthEvents.map((event, i) => (
              <li key={i} className="flex justify-between items-center p-2 rounded bg-brand-surface">
                <div>
                  <p>{event.name}</p>
                  <p className="text-xs text-brand-text-secondary">{event.date}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${event.type === 'Birthday' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>{event.type}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Main: Customer List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer List & Filters */}
        <div className="lg:col-span-1 bg-brand-sidebar border border-brand-border rounded-xl p-4 shadow-lg h-fit">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
            </div>
             <select 
                value={eventFilter} 
                onChange={e => setEventFilter(e.target.value as EventFilter)} 
                className="bg-brand-surface border border-brand-border rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
                <option value="all">All Events</option>
                <option value="birthday">Upcoming Birthdays</option>
                <option value="anniversary">Upcoming Anniversaries</option>
            </select>
          </div>
          <div className="flex gap-2 mb-2">
            <label className="text-xs">Order Filter:</label>
            <select value={orderFilter} onChange={e => setOrderFilter(e.target.value as any)} className="bg-brand-surface border border-brand-border rounded-lg py-1 px-2 text-xs">
              <option value="all">All</option>
              <option value="withOrders">With Orders</option>
              <option value="withoutOrders">No Orders</option>
            </select>
          </div>
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredCustomers.map(customer => (
              <li key={customer.id}>
                <button
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedCustomer?.id === customer.id ? 'bg-brand-primary text-white' : 'hover:bg-brand-surface'}`}
                >
                  <span className="font-semibold">{customer.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Right: Customer Details & Order History */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg">
                {selectedCustomer ? (
                  <div className="bg-white rounded-xl shadow p-6 border border-brand-border">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-brand-primary mb-1">{selectedCustomer.name}</h2>
                        <div className="flex flex-wrap gap-4 text-sm text-brand-text-secondary">
                          <span><strong>Phone:</strong> {selectedCustomer.phone}</span>
                          {selectedCustomer.email && <span><strong>Email:</strong> {selectedCustomer.email}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 mt-4 md:mt-0 text-sm text-brand-text-secondary">
                        <span><strong>Birthday:</strong> {formatEventDate(selectedCustomer.birthday) || <span className="text-brand-text-secondary/50">Not provided</span>}</span>
                        <span><strong>Anniversary:</strong> {selectedCustomer.anniversary ? formatEventDate(selectedCustomer.anniversary) : <span className="text-brand-text-secondary/50">Not provided</span>}</span>
                      </div>
                    </div>
                    <div className="mb-2 text-sm text-brand-text-secondary">
                      <strong>Address:</strong> {selectedCustomer.address || <span className="text-brand-text-secondary/50">Not provided</span>}
                    </div>
                    <h3 className="text-lg font-semibold mt-6 mb-2">Order History</h3>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {customerOrders.length > 0 ? customerOrders.map(order => (
                        <li key={order.id} className="flex justify-between p-2 rounded bg-brand-surface">
                          <span>#{order.id?.slice(-6)} on {new Date(order.date).toLocaleDateString()}</span>
                          <span className="font-medium">₹{order.total.toFixed(2)}</span>
                        </li>
                      )) : <p className="text-brand-text-secondary">No orders found.</p>}
                    </ul>
                  </div>
                ) : <p className="text-center py-20 text-brand-text-secondary">Select a customer to view details.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Customers;