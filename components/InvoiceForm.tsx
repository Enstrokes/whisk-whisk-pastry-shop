import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, Customer, StockItem, InvoiceItem, PaymentStatus, OrderType } from '../types';
import { DeleteIcon, PrintIcon } from './Icons';

interface InvoiceFormProps {
  initialInvoice: Invoice | Omit<Invoice, 'id'>;
  customers: Customer[];
  products: StockItem[];
  onSave: (invoice: Invoice | Omit<Invoice, 'id'>) => void;
  onCancel: () => void;
}

const inputStyle = "w-full bg-slate-100 border-transparent rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed";
const labelStyle = "text-sm text-brand-text-secondary mb-1 block";

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialInvoice, customers, products, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialInvoice);
  const [customerDetails, setCustomerDetails] = useState({ phone: '', email: ''});
  const [gstType, setGstType] = useState<'with_gst' | 'without_gst'>('with_gst');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    setFormData(initialInvoice);
    
    if ('items' in initialInvoice && Array.isArray(initialInvoice.items) && initialInvoice.items.some(item => item.gst > 0)) {
        setGstType('with_gst');
    } else {
        setGstType('without_gst');
    }

    if (initialInvoice.customerId) {
        const customer = customers.find(c => c.id === initialInvoice.customerId);
        if(customer) {
            setCustomerDetails({ phone: customer.phone, email: customer.email });
            setCustomerSearch(`${customer.phone} (${customer.name})`);
        }
    } else {
        setCustomerDetails({ phone: '', email: '' });
        setCustomerSearch('');
    }
  }, [initialInvoice, customers]);
  
  const totals = useMemo(() => {
    const subtotal = formData.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = formData.items.reduce((acc, item) => {
        return acc + (item.price * item.quantity * (item.discount / 100));
    }, 0);
    const gstAmount = formData.items.reduce((acc, item) => {
        const itemTotal = item.price * item.quantity;
        const itemDiscount = itemTotal * (item.discount / 100);
        return acc + ((itemTotal - itemDiscount) * (item.gst / 100));
    }, 0);

    const grandTotal = subtotal - discountAmount + gstAmount;
    const balanceDue = grandTotal - formData.amountPaid;

    return { subtotal, discountAmount, gstAmount, grandTotal, balanceDue };
  }, [formData.items, formData.amountPaid]);

  const filteredCustomers = useMemo(() => {
    const selectedCustomerString = formData.customerId ? `${customerDetails.phone} (${formData.customerName})` : null;
    if (selectedCustomerString && customerSearch === selectedCustomerString) {
      return [];
    }
    if (!customerSearch) return customers;
    const searchLower = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.phone.includes(customerSearch) || 
      c.name.toLowerCase().includes(searchLower)
    );
  }, [customers, customerSearch, formData.customerId, customerDetails.phone, formData.customerName]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['amountPaid'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };

  const handleGstTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGstType = e.target.value as 'with_gst' | 'without_gst';
    setGstType(newGstType);

    if (newGstType === 'without_gst') {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => ({ ...item, gst: 0 }))
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => ({ ...item, gst: 18 })) // Default GST
        }));
    }
  };
  
  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setCustomerSearch(newSearchTerm);
    setShowCustomerDropdown(true);

    const currentSelectionString = formData.customerId ? `${customerDetails.phone} (${formData.customerName})` : null;
    if (currentSelectionString && newSearchTerm !== currentSelectionString) {
        setFormData(prev => ({...prev, customerId: '', customerName: ''}));
        setCustomerDetails({ phone: '', email: '' });
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
        ...prev,
        customerId: customer.id!,
        customerName: customer.name
    }));
    setCustomerDetails({ phone: customer.phone, email: customer.email });
    setCustomerSearch(`${customer.phone} (${customer.name})`);
    setShowCustomerDropdown(false);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    
    if(field === 'productId') {
        const product = products.find(p => p.id === value);
        if(product) {
            item.productId = product.id!;
            item.productName = product.name;
            item.price = product.sellingPrice || product.costPerUnit * 1.5;
        }
    } else {
        const numericValue = Number(value);
        if (!isNaN(numericValue) && numericValue >= 0) {
            (item[field] as number) = numericValue;
        }
    }

    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', productName: '', quantity: 1, price: 0, discount: 0, gst: gstType === 'with_gst' ? 18 : 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.customerId) {
        alert("Please select a customer.");
        return;
    }
    if(formData.items.length === 0 || formData.items.some(i => !i.productId)) {
        alert("Please add at least one item and select a product for each.");
        return;
    }
    const finalInvoiceData = {
        ...formData,
        subtotal: totals.subtotal,
        total: totals.grandTotal,
        discount: totals.subtotal > 0 ? (totals.discountAmount / totals.subtotal) * 100 : 0,
        gst: (totals.subtotal - totals.discountAmount) > 0 ? (totals.gstAmount / (totals.subtotal - totals.discountAmount)) * 100 : 0,
    };
    onSave(finalInvoiceData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm text-brand-text">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <div>
                <label className={labelStyle}>Invoice #</label>
                <input type="text" value={'id' in formData && formData.id ? `...${formData.id.slice(-6)}` : 'Auto-generated'} className={`${inputStyle} bg-slate-200 cursor-not-allowed text-center`} readOnly />
            </div>
            <div>
                <label className={labelStyle}>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className={`${inputStyle} custom-date-input`} />
            </div>
            <div>
                 <label className={labelStyle}>GST Type</label>
                 <select value={gstType} onChange={handleGstTypeChange} className={inputStyle}>
                    <option value="with_gst">With GST</option>
                    <option value="without_gst">Without GST</option>
                </select>
            </div>
             <div>
                 <label className={labelStyle}>Order Type</label>
                <select name="orderType" value={formData.orderType} onChange={handleInputChange} className={inputStyle}>
                    {Object.values(OrderType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-lg">
            <div className="relative md:col-span-3">
              <label className={labelStyle}>Customer</label>
              <input
                type="text"
                placeholder="Search by phone number or name..."
                value={customerSearch}
                onChange={handleCustomerSearchChange}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                className={inputStyle}
                autoComplete="off"
                required={!formData.customerId}
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-brand-border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {filteredCustomers.map(c => (
                    <li
                      key={c.id}
                      onMouseDown={() => handleCustomerSelect(c)}
                      className="p-2 hover:bg-brand-primary hover:text-white cursor-pointer"
                    >
                      {c.phone} ({c.name})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
                <input type="text" placeholder="Customer Name" value={formData.customerName} className={`${inputStyle} bg-slate-200`} readOnly/>
            </div>
             <div>
                <input type="text" placeholder="Phone Number" value={customerDetails.phone} className={`${inputStyle} bg-slate-200`} readOnly/>
            </div>
            <div>
                <input type="text" placeholder="Email (optional)" value={customerDetails.email} className={`${inputStyle} bg-slate-200`} readOnly/>
            </div>
        </div>

        <div>
            {/* Desktop Headers */}
            <div className="hidden md:grid md:grid-cols-[1fr_90px_110px_110px_110px_110px_auto] gap-x-3 items-center mb-2">
                <label className={labelStyle}>Item</label>
                <label className={`${labelStyle} text-center`}>Qty</label>
                <label className={`${labelStyle} text-right`}>Price</label>
                <label className={`${labelStyle} text-right`}>GST %</label>
                <label className={`${labelStyle} text-right`}>Disc. %</label>
                <label className={`${labelStyle} text-right`}>Total</label>
                <span />
            </div>

            {/* Item Rows */}
            <div className="space-y-4 md:space-y-2">
                {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-[1fr_90px_110px_110px_110px_110px_auto] gap-x-3 gap-y-2 items-center bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                        <div className="col-span-2 md:col-span-1">
                            <label className={`${labelStyle} md:hidden`}>Item</label>
                            <select value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} className={inputStyle}>
                                <option value="">Select Product</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`${labelStyle} md:hidden text-center`}>Qty</label>
                            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className={`${inputStyle} text-center`} min="1"/>
                        </div>
                        <div>
                             <label className={`${labelStyle} md:hidden text-right`}>Price</label>
                            <input type="number" step="0.01" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} className={`${inputStyle} text-right`} />
                        </div>
                        <div>
                            <label className={`${labelStyle} md:hidden text-right`}>GST %</label>
                            <input type="number" value={item.gst} onChange={(e) => handleItemChange(index, 'gst', e.target.value)} className={`${inputStyle} text-right`} min="0"/>
                        </div>
                         <div>
                             <label className={`${labelStyle} md:hidden text-right`}>Disc. %</label>
                            <input type="number" value={item.discount} onChange={(e) => handleItemChange(index, 'discount', e.target.value)} className={`${inputStyle} text-right`} min="0" max="100"/>
                        </div>
                        <div>
                            <label className={`${labelStyle} md:hidden text-right`}>Total</label>
                            <input type="text" value={`₹${(item.quantity * item.price).toFixed(2)}`} className={`${inputStyle} text-right bg-slate-200`} readOnly/>
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-end">
                            <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-full"><DeleteIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 text-brand-primary font-semibold hover:text-brand-secondary text-sm">+ Add Item</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
            <div>
                <label className={labelStyle}>Notes / Special Instructions</label>
                <textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} className={`${inputStyle} h-24`} />
            </div>
            <div className="space-y-2 text-md">
                 <div className="flex justify-between">
                    <span className="text-brand-text-secondary">Subtotal:</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between text-green-600">
                    <span className="text-brand-text-secondary">Discount:</span>
                    <span>- ₹{totals.discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-brand-text-secondary">GST:</span>
                    <span>+ ₹{totals.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2">
                    <span>Grand Total:</span>
                    <span>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span>Amount Paid:</span>
                    <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleInputChange} className={`${inputStyle} w-32 text-right`} />
                </div>
                 <div className="flex justify-between font-bold">
                    <span>Balance Due:</span>
                    <span className={totals.balanceDue > 0 ? 'text-red-500' : ''}>₹{totals.balanceDue.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t">
            <div>
                 <button type="button" className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 justify-center">
                    <PrintIcon className="w-5 h-5" /> Print/Download
                </button>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                 <button type="button" onClick={onCancel} className="flex-1 sm:flex-none bg-slate-200 hover:bg-slate-300 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 sm:flex-none bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors">Save Invoice</button>
            </div>
        </div>
    </form>
  );
};

export default InvoiceForm;