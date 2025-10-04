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
    readOnly?: boolean;
}

const inputStyle = "w-full bg-slate-100 border-transparent rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed";
const labelStyle = "text-sm text-brand-text-secondary mb-1 block";

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialInvoice, invoice, customers, products, onSave, onCancel, readOnly = false }) => {
    // WhatsApp send state
    const [sendWhatsApp, setSendWhatsApp] = useState(false);
    const [sending, setSending] = useState(false);
    const [whatsAppSent, setWhatsAppSent] = useState(false);
    const baseInvoice = invoice || initialInvoice || { items: [], amountPaid: '' };
    const [formData, setFormData] = useState({
        ...baseInvoice,
        items: Array.isArray((baseInvoice as any).items) ? (baseInvoice as any).items : [],
        amountPaid: (baseInvoice as any).amountPaid ?? '',
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
        if (readOnly) return;
        const { name, value } = e.target;
        const isNumeric = ['amountPaid'].includes(name);
        if (isNumeric) {
            // Handle numeric fields - allow empty values
            if (value === '') {
                setFormData(prev => ({ ...prev, [name]: '' }));
            } else {
                const numericValue = parseFloat(value);
                setFormData(prev => ({ ...prev, [name]: isNaN(numericValue) ? '' : numericValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGstTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (readOnly) return;
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
        if (readOnly) return;
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
        if (readOnly) return;
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
        if (readOnly) return;
  console.log('[handleItemChange] index:', index, 'field:', field, 'value:', value, {
    itemsBefore: formData.items,
    products,
    fieldType: typeof value
  });
  const items = Array.isArray(formData.items) ? [...formData.items] : [];
  let item = { ...items[index] };

  if (field === 'productId') {
    const productId = String(value);
    const product = products.find(p => String(p._id) === productId);
    console.log('[handleItemChange] Looking for productId:', productId, 'Found:', product, {
      allProducts: products,
      itemBefore: item,
      itemsBefore: items
    });
    if (product) {
      item = {
        productId: String(product._id),
        productName: product.name,
        quantity: 1,
        price: product.sellingPrice || (product.costPerUnit ? product.costPerUnit * 1.5 : 0) || 0,
        gst: gstType === 'with_gst' ? (typeof product.gst === 'number' ? product.gst : 18) : 0,
        discount: typeof product.discount === 'number' ? product.discount : 0,
      };
    } else {
      console.warn('[handleItemChange] No product found for productId:', productId, 'products:', products);
    }
  } else {
    // Handle numeric fields - allow empty strings and convert appropriately
    if (value === '' || value === null || value === undefined) {
      (item[field] as any) = '';
    } else {
      const numericValue = Number(value);
      if (!isNaN(numericValue) && numericValue >= 0) {
        (item[field] as any) = numericValue;
      }
    }
  }

  items[index] = item;
  console.log('[handleItemChange] items after:', items);
  setFormData(prev => ({ ...prev, items }));
};

        const addItem = () => {
            if (readOnly) return;
    console.log('[addItem] Adding new item. Current items:', formData.items);
    console.log('[addItem] Adding new item. Current items:', formData.items);
        setFormData(prev => ({
            ...prev,
            items: Array.isArray(prev.items)
                ? [...prev.items, { productId: '', productName: '', quantity: '', price: '', discount: '', gst: gstType === 'with_gst' ? 18 : 0 }]
                : [{ productId: '', productName: '', quantity: '', price: '', discount: '', gst: gstType === 'with_gst' ? 18 : 0 }]
        }));
    };

        const removeItem = (index: number) => {
            if (readOnly) return;
        setFormData(prev => ({
            ...prev,
            items: Array.isArray(prev.items) ? prev.items.filter((_, i) => i !== index) : []
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (readOnly) return;
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
        setSending(true);
        setWhatsAppSent(false);
        try {
            await onSave(finalInvoiceData);
            if (sendWhatsApp) {
                // Simulate WhatsApp send
                setTimeout(() => {
                    setWhatsAppSent(true);
                    setSending(false);
                }, 1000);
            } else {
                setSending(false);
            }
        } catch (err) {
            setSending(false);
        }
    };

    // ...existing code...
        return (
            <div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-sm text-brand-text">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label className={labelStyle}>Invoice #</label>
                <input type="text" value={formData.invoiceNumber ? formData.invoiceNumber : 'Auto-generated'} className={`${inputStyle} bg-slate-200 cursor-not-allowed text-center`} readOnly />
            </div>
            <div>
                <label className={labelStyle}>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className={`${inputStyle} custom-date-input`} readOnly={readOnly} disabled={readOnly} />
            </div>
            <div>
                <label className={labelStyle}>GST Type</label>
                <select value={gstType} onChange={handleGstTypeChange} className={inputStyle} disabled={readOnly}>
                    <option value="with_gst">With GST</option>
                    <option value="without_gst">Without GST</option>
                </select>
            </div>
            <div>
                <label className={labelStyle}>Order Type</label>
                <select name="orderType" value={formData.orderType} onChange={handleInputChange} className={inputStyle} disabled={readOnly}>
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
                                readOnly={readOnly}
                                disabled={readOnly}
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
                                readOnly={!!formData.customerId || readOnly}
                                disabled={readOnly}
                                onChange={e => {
                                    if (!formData.customerId && !readOnly) setFormData(prev => ({ ...prev, customerName: e.target.value }));
                                }}
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Phone Number"
                                value={customerDetails.phone}
                                className={inputStyle + (formData.customerId ? ' bg-slate-200' : '')}
                                readOnly={!!formData.customerId || readOnly}
                                disabled={readOnly}
                                onChange={e => {
                                    if (!formData.customerId && !readOnly) setCustomerDetails(prev => ({ ...prev, phone: e.target.value }));
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
                                readOnly={!!formData.customerId || readOnly}
                                disabled={readOnly}
                                onChange={e => {
                                    if (!formData.customerId && !readOnly) setCustomerDetails(prev => ({ ...prev, email: e.target.value }));
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
                                readOnly={!!formData.customerId || readOnly}
                                disabled={readOnly}
                                onChange={e => {
                                    if (!formData.customerId && !readOnly) setCustomerDetails(prev => ({ ...prev, address: e.target.value }));
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
                                readOnly={!!formData.customerId || readOnly}
                                disabled={readOnly}
                                onChange={e => {
                                    if (!formData.customerId && !readOnly) setCustomerDetails(prev => ({ ...prev, birthday: e.target.value }));
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
                                readOnly={!!formData.customerId || readOnly}
                                disabled={readOnly}
                                onChange={e => {
                                    if (!formData.customerId && !readOnly) setCustomerDetails(prev => ({ ...prev, anniversary: e.target.value }));
                                }}
                            />
                        </div>
        </div>

        <div>
            {/* Desktop Headers */}
            <div className="hidden md:grid md:grid-cols-[1fr_80px_90px_110px_110px_110px_110px_auto] gap-x-3 items-center mb-2">
                <label className={labelStyle}>Item</label>
                <label className={`${labelStyle} text-center`}>Unit</label>
                <label className={`${labelStyle} text-center`}>Qty</label>
                <label className={`${labelStyle} text-right`}>Price</label>
                <label className={`${labelStyle} text-right`}>GST %</label>
                <label className={`${labelStyle} text-right`}>Disc. %</label>
                <label className={`${labelStyle} text-right`}>Total</label>
                <span />
            </div>

            {/* Item Rows */}
                        <div className="space-y-4 md:space-y-2">
                            {formData.items.map((item, index) => {
                                const selectedProduct = products.find(p => String(p._id) === String(item.productId));
                                return (
                                <div key={index} className="grid grid-cols-2 md:grid-cols-[1fr_80px_90px_110px_110px_110px_110px_auto] gap-x-3 gap-y-2 items-center bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className={`${labelStyle} md:hidden`}>Item</label>
                                                                                <select
    value={item.productId && item.productId !== 'undefined' ? String(item.productId) : ''}
    onChange={(e) => {
        if (readOnly) return;
        const value = e.target.value === 'undefined' ? '' : e.target.value;
        handleItemChange(index, 'productId', value);
    }}
    className={inputStyle}
    required
    disabled={readOnly}
>
  {(() => {
    console.log('[Dropdown] products prop:', products, {
      item,
      allItems: formData.items
    });
    if (!products || products.length === 0) {
      return <option value="" disabled>No products available</option>;
    }
    return [
      <option value="" disabled key="placeholder">Select Product</option>,
      ...products
        .filter(p => {
          if (!item.productId) return true;
          const isSelected = formData.items.some((it, idx) => idx !== index && it.productId && String(it.productId) === String(p._id));
          return !isSelected || String(item.productId) === String(p._id);
        })
        .map(p => (
          <option key={`${p._id}-${p.name}`} value={String(p._id)}>{p.name}</option>
        ))
    ];
  })()}
</select>
                                    </div>
                                    <div>
                                        <label className={`${labelStyle} md:hidden text-center`}>Unit</label>
                                        <input type="text" value={selectedProduct?.unit || ''} className={`${inputStyle} text-center bg-slate-200`} readOnly/>
                                    </div>
                                    <div>
                                        <label className={`${labelStyle} md:hidden text-center`}>Qty</label>
                                        <input 
                                            type="number" 
                                            value={item.quantity === '' || item.quantity === 0 ? '' : item.quantity} 
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : e.target.value)} 
                                            className={`${inputStyle} text-center`} 
                                            min="1" 
                                            placeholder="0"
                                            readOnly={readOnly} 
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div>
                                        <label className={`${labelStyle} md:hidden text-right`}>Price</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            value={item.price === '' || item.price === 0 ? '' : item.price} 
                                            onChange={(e) => handleItemChange(index, 'price', e.target.value === '' ? '' : e.target.value)} 
                                            className={`${inputStyle} text-right`} 
                                            placeholder="0.00"
                                            readOnly={readOnly} 
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div>
                                        <label className={`${labelStyle} md:hidden text-right`}>GST %</label>
                                        <input 
                                            type="number" 
                                            value={item.gst === '' || item.gst === 0 ? '' : item.gst} 
                                            onChange={(e) => handleItemChange(index, 'gst', e.target.value === '' ? '' : e.target.value)} 
                                            className={`${inputStyle} text-right`} 
                                            min="0" 
                                            placeholder="0"
                                            readOnly={readOnly} 
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div>
                                        <label className={`${labelStyle} md:hidden text-right`}>Disc. %</label>
                                        <input 
                                            type="number" 
                                            value={item.discount === '' || item.discount === 0 ? '' : item.discount} 
                                            onChange={(e) => handleItemChange(index, 'discount', e.target.value === '' ? '' : e.target.value)} 
                                            className={`${inputStyle} text-right`} 
                                            min="0" 
                                            max="100" 
                                            placeholder="0"
                                            readOnly={readOnly} 
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div>
                                        <label className={`${labelStyle} md:hidden text-right`}>Total</label>
                                        <input type="text" value={`₹${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`} className={`${inputStyle} text-right bg-slate-200`} readOnly/>
                                    </div>
                                                                        <div className="col-span-2 md:col-span-1 flex justify-end">
                                                                                {!readOnly && (
                                                                                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-full"><DeleteIcon className="w-5 h-5"/></button>
                                                                                )}
                                                                        </div>
                                </div>
                            );
                            })}
                        </div>
                                                {!readOnly && (
                                                    <button type="button" onClick={addItem} className="mt-2 text-brand-primary font-semibold hover:text-brand-secondary text-sm">+ Add Item</button>
                                                )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                        <div>
                            <label className={labelStyle}>Notes / Special Instructions</label>
                            <textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} className={`${inputStyle} h-24`} readOnly={readOnly} disabled={readOnly}/>
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
                                <input 
                                    type="number" 
                                    name="amountPaid" 
                                    value={formData.amountPaid === 0 ? '' : formData.amountPaid} 
                                    onChange={handleInputChange} 
                                    className={`${inputStyle} w-32 text-right`} 
                                    placeholder="0.00"
                                    readOnly={readOnly} 
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Balance Due:</span>
                                <span className={totals.balanceDue > 0 ? 'text-red-500' : ''}>₹{totals.balanceDue.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                                        <div className="flex flex-col gap-2 mt-8">
                                                {!readOnly && (
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={sendWhatsApp}
                                                            onChange={e => setSendWhatsApp(e.target.checked)}
                                                            disabled={sending}
                                                        />
                                                        <span>Send invoice via WhatsApp</span>
                                                    </label>
                                                )}
                                                {whatsAppSent && (
                                                    <div className="text-green-600 text-sm">Invoice sent via WhatsApp!</div>
                                                )}
                                                <div className="flex justify-end gap-4">
                                                        <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition">Cancel</button>
                                                        {!readOnly && (
                                                                <button type="submit" className="px-6 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-secondary transition" disabled={sending}>
                                                                        {sending ? 'Sending...' : 'Save Invoice'}
                                                                </button>
                                                        )}
                                                </div>
                                        </div>
                </form>
            </div>
    );

}
export default InvoiceForm;