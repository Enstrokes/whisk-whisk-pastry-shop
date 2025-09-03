import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, Customer, StockItem, InvoiceItem, PaymentStatus, OrderType } from '../types';
import { DeleteIcon, PrintIcon } from './Icons';

interface InvoiceFormProps {
    initialInvoice?: Invoice | Omit<Invoice, 'id'>;
    invoice?: Invoice | Omit<Invoice, 'id'>;
    customers: Customer[];
    products: StockItem[];
    onSave: (invoice: Invoice | Omit<Invoice, 'id'>) => void;
    onCancel: () => void;
}

const inputStyle = "w-full bg-slate-100 border-transparent rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed";
const labelStyle = "text-sm text-brand-text-secondary mb-1 block";

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialInvoice, invoice, customers, products, onSave, onCancel }) => {
    const baseInvoice = invoice || initialInvoice || { items: [], amountPaid: 0 };
    const [formData, setFormData] = useState({
        ...baseInvoice,
        items: Array.isArray((baseInvoice as any).items) ? (baseInvoice as any).items : [],
        amountPaid: (baseInvoice as any).amountPaid ?? 0,
    });
    const [customerDetails, setCustomerDetails] = useState({
        phone: '',
        email: '',
        address: '',
        birthday: '',
        anniversary: ''
    });
    const [gstType, setGstType] = useState<'with_gst' | 'without_gst'>('with_gst');
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Calculate totals
    const totals = useMemo(() => {
        let subtotal = 0, discountAmount = 0, gstAmount = 0;
        if (Array.isArray(formData.items)) {
            for (const item of formData.items) {
                const itemSubtotal = (item.quantity || 0) * (item.price || 0);
                subtotal += itemSubtotal;
                discountAmount += itemSubtotal * ((item.discount || 0) / 100);
                const afterDiscount = itemSubtotal - (itemSubtotal * ((item.discount || 0) / 100));
                gstAmount += afterDiscount * ((item.gst || 0) / 100);
            }
        }
        const grandTotal = subtotal - discountAmount + gstAmount;
        const balanceDue = grandTotal - (formData.amountPaid || 0);
        return { subtotal, discountAmount, gstAmount, grandTotal, balanceDue };
    }, [formData.items, formData.amountPaid]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const searchLower = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.phone.includes(customerSearch) ||
            c.name.toLowerCase().includes(searchLower)
        );
    }, [customers, customerSearch]);

    // ...existing logic and hooks...


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
    console.log('[handleItemChange] index:', index, 'field:', field, 'value:', value);
    console.log('[handleItemChange] items before:', formData.items);
    console.log('[handleItemChange] index:', index, 'field:', field, 'value:', value);
    console.log('[handleItemChange] items before:', formData.items);
    const items = Array.isArray(formData.items) ? [...formData.items] : [];
    let item = { ...items[index] };

    if (field === 'productId') {
        const productId = String(value);
        const product = products.find(p => String(p.id) === productId);
        if (product) {
            // When changing product, reset all fields to product defaults and quantity to 1
            item = {
                productId: String(product.id),
                productName: product.name,
                quantity: 1,
                price: product.sellingPrice || (product.costPerUnit ? product.costPerUnit * 1.5 : 0) || 0,
                gst: gstType === 'with_gst' ? (typeof product.gst === 'number' ? product.gst : 18) : 0,
                discount: typeof product.discount === 'number' ? product.discount : 0,
            };
        }
    } else {
        const numericValue = Number(value);
        if (!isNaN(numericValue) && numericValue >= 0) {
            (item[field] as number) = numericValue;
        }
    }

    items[index] = item;
    setFormData(prev => ({ ...prev, items }));
  };

    const addItem = () => {
    console.log('[addItem] Adding new item. Current items:', formData.items);
    console.log('[addItem] Adding new item. Current items:', formData.items);
        setFormData(prev => ({
            ...prev,
            items: Array.isArray(prev.items)
                ? [...prev.items, { productId: '', productName: '', quantity: 1, price: 0, discount: 0, gst: gstType === 'with_gst' ? 18 : 0 }]
                : [{ productId: '', productName: '', quantity: 1, price: 0, discount: 0, gst: gstType === 'with_gst' ? 18 : 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: Array.isArray(prev.items) ? prev.items.filter((_, i) => i !== index) : []
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customerId && (!formData.customerName || !customerDetails.phone)) {
                alert("Please select a customer or enter new customer details.");
                return;
        }
        if(formData.items.length === 0 || formData.items.some(i => !i.productId)) {
                alert("Please add at least one item and select a product for each.");
                return;
        }
        // Auto-calculate payment status (only Pending or Paid)
        let paymentStatus: PaymentStatus = PaymentStatus.Pending;
        if ((formData.amountPaid ?? 0) >= totals.grandTotal && totals.grandTotal > 0) {
            paymentStatus = PaymentStatus.Paid;
        } else {
            paymentStatus = PaymentStatus.Pending;
        }
        let finalInvoiceData = {
            ...formData,
            subtotal: totals.subtotal,
            total: totals.grandTotal,
            discount: totals.subtotal > 0 ? (totals.discountAmount / totals.subtotal) * 100 : 0,
            gst: (totals.subtotal - totals.discountAmount) > 0 ? (totals.gstAmount / (totals.subtotal - totals.discountAmount)) * 100 : 0,
            paymentStatus,
        };
        if (!formData.customerId) {
            finalInvoiceData = {
                ...finalInvoiceData,
                customerPhone: customerDetails.phone,
                customerEmail: customerDetails.email,
                customerAddress: customerDetails.address,
                customerBirthday: customerDetails.birthday,
                customerAnniversary: customerDetails.anniversary,
            };
        }
        onSave(finalInvoiceData);
    };

    // ...existing code...
        return (
            <div>
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ minWidth: 0, minHeight: '100vh', margin: 0, padding: 0 }}>
                    <div className="absolute inset-0" style={{ background: 'rgb(0 0 0 / 60%)' }} />
                    <form onSubmit={handleSubmit} className="relative w-full max-w-7xl bg-white rounded-3xl shadow-lg p-6 sm:p-8 m-2 flex flex-col gap-6 text-sm text-brand-text" style={{ minWidth: 0 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label className={labelStyle}>Invoice #</label>
                <input type="text" value={formData.invoiceNumber ? formData.invoiceNumber : 'Auto-generated'} className={`${inputStyle} bg-slate-200 cursor-not-allowed text-center`} readOnly />
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
                required={!formData.customerId && !formData.customerName}
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
                            <input
                                type="text"
                                placeholder="Customer Name"
                                value={formData.customerName}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId}
                                onChange={e => {
                                    if (!formData.customerId) setFormData(prev => ({ ...prev, customerName: e.target.value }));
                                }}
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Phone Number"
                                value={customerDetails.phone}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId}
                                onChange={e => {
                                    if (!formData.customerId) setCustomerDetails(prev => ({ ...prev, phone: e.target.value }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Email (optional)</label>
                            <input
                                type="text"
                                placeholder="Email"
                                value={customerDetails.email}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId}
                                onChange={e => {
                                    if (!formData.customerId) setCustomerDetails(prev => ({ ...prev, email: e.target.value }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Address (optional)</label>
                            <input
                                type="text"
                                placeholder="Address"
                                value={customerDetails.address || ''}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId}
                                onChange={e => {
                                    if (!formData.customerId) setCustomerDetails(prev => ({ ...prev, address: e.target.value }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Birthday (optional)</label>
                            <input
                                type="date"
                                placeholder="Birthday"
                                value={customerDetails.birthday || ''}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId}
                                onChange={e => {
                                    if (!formData.customerId) setCustomerDetails(prev => ({ ...prev, birthday: e.target.value }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Anniversary (optional)</label>
                            <input
                                type="date"
                                placeholder="Anniversary (optional)"
                                value={customerDetails.anniversary || ''}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId}
                                onChange={e => {
                                    if (!formData.customerId) setCustomerDetails(prev => ({ ...prev, anniversary: e.target.value }));
                                }}
                            />
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
                                        <select value={item.productId || ''} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} className={inputStyle} required>
                                            <option value="" disabled>Select Product</option>
                                            {products
                                                .filter(p => {
                                                    const isSelected = formData.items.some((it, idx) => idx !== index && it.productId && it.productId === String(p.id));
                                                    return !isSelected || item.productId === String(p.id);
                                                })
                                                .map(p => (
                                                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                ))}
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
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-secondary transition">Save Invoice</button>
                    </div>
                </form>
            </div>
        </div>
    );

}
export default InvoiceForm;