import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Invoice } from '../types';
import { SearchIcon, BirthdayIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

type EventFilter = 'all' | 'birthday' | 'anniversary';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const { token } = useAuth();

  useEffect(() => {
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${token}` };
            const [customersRes, invoicesRes] = await Promise.all([
                fetch(`${API_URL}/api/customers`, { headers }),
                fetch(`${API_URL}/api/invoices`, { headers })
            ]);
            setCustomers(await customersRes.json());
            setInvoices(await invoicesRes.json());
        } catch (error) {
            console.error("Failed to fetch customer data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (token) {
        fetchAllData();
    }
  }, [token]);

  const filteredCustomers = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return customers
      .filter(c => {
        const searchLower = searchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(searchLower) ||
          c.phone.includes(searchLower)
        );
      })
      .filter(c => {
        if (eventFilter === 'all') return true;
        
        const checkDate = (dateStr: string | undefined) => {
            if (!dateStr) return false;
            const eventDate = new Date(dateStr);
            eventDate.setFullYear(today.getFullYear());
            // If the event date this year has already passed, check for next year's event date
            if (eventDate < today) {
                eventDate.setFullYear(today.getFullYear() + 1);
            }
            // Now check if the (potentially advanced) event date is within the next 30 days
            const futureDateForComparison = new Date();
            futureDateForComparison.setDate(today.getDate() + 30);
            return eventDate <= futureDateForComparison;
        };

        if (eventFilter === 'birthday') return checkDate(c.birthday);
        if (eventFilter === 'anniversary') return checkDate(c.anniversary);

        return false;
      });
  }, [customers, searchTerm, eventFilter]);
  
  useEffect(() => {
    // This effect ensures a customer is always selected if the list is not empty,
    // and handles re-selection if the currently selected customer is filtered out.
    if (filteredCustomers.length > 0 && (!selectedCustomer || !filteredCustomers.find(c => c.id === selectedCustomer.id))) {
        setSelectedCustomer(filteredCustomers[0]);
    } else if (filteredCustomers.length === 0) {
        setSelectedCustomer(null);
    }
  }, [filteredCustomers, selectedCustomer]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(inv => inv.customerId === selectedCustomer.id);
  }, [selectedCustomer, invoices]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const upcoming: { name: string, date: string, type: 'Birthday' | 'Anniversary' }[] = [];
    customers.forEach(c => {
      const thisYearBirthday = new Date(c.birthday);
      thisYearBirthday.setFullYear(today.getFullYear());
      if (thisYearBirthday >= today) {
        upcoming.push({ name: c.name, date: thisYearBirthday.toLocaleDateString(), type: 'Birthday' });
      }
      if (c.anniversary) {
        const thisYearAnniversary = new Date(c.anniversary);
        thisYearAnniversary.setFullYear(today.getFullYear());
        if (thisYearAnniversary >= today) {
          upcoming.push({ name: c.name, date: thisYearAnniversary.toLocaleDateString(), type: 'Anniversary' });
        }
      }
    });
    return upcoming.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
  }, [customers]);
  
  if (loading) return <div className="text-center p-10">Loading Customers...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-brand-text">Customers</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredCustomers.map(customer => (
              <li key={customer.id}>
                <button
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedCustomer?.id === customer.id ? 'bg-brand-primary text-white' : 'hover:bg-brand-surface'}`}
                >
                  {customer.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg">
                {selectedCustomer ? (
                    <div>
                        <h2 className="text-2xl font-bold text-brand-primary mb-4">{selectedCustomer.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <p><strong className="text-brand-text-secondary">Email:</strong> {selectedCustomer.email}</p>
                            <p><strong className="text-brand-text-secondary">Phone:</strong> {selectedCustomer.phone}</p>
                            <p className="md:col-span-2"><strong className="text-brand-text-secondary">Address:</strong> {selectedCustomer.address}</p>
                            <p><strong className="text-brand-text-secondary">Birthday:</strong> {new Date(selectedCustomer.birthday).toLocaleDateString()}</p>
                            {selectedCustomer.anniversary && <p><strong className="text-brand-text-secondary">Anniversary:</strong> {new Date(selectedCustomer.anniversary).toLocaleDateString()}</p>}
                        </div>

                        <h3 className="text-xl font-semibold mt-6 mb-2 border-t border-brand-border pt-4">Order History</h3>
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {customerOrders.length > 0 ? customerOrders.map(order => (
                                <li key={order.id} className="flex justify-between p-2 rounded bg-brand-surface">
                                    <span>#{order.id?.slice(-6)} on {order.date}</span>
                                    <span className="font-medium">₹{order.total.toFixed(2)}</span>
                                </li>
                            )) : <p className="text-brand-text-secondary">No orders found.</p>}
                        </ul>
                    </div>
                ) : <p className="text-center py-20 text-brand-text-secondary">Select a customer to view details.</p>}
            </div>
            <div className="bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <BirthdayIcon className="w-6 h-6 text-brand-accent" />
                    Upcoming Birthdays & Anniversaries
                </h3>
                <ul className="space-y-2">
                    {upcomingEvents.map((event, i) => (
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
      </div>
    </div>
  );
};

export default Customers;