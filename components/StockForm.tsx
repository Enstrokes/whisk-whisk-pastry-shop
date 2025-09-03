import React, { useState, useEffect } from 'react';
import { StockItem, StockCategory } from '../types';

interface StockFormProps {
    initialItem: StockItem | Omit<StockItem, 'id'>;
    onSave: (item: StockItem | Omit<StockItem, 'id'>) => void;
    onCancel: () => void;
}

const inputStyle = "w-full bg-slate-100 border-transparent rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors";
const labelStyle = "text-sm text-brand-text-secondary mb-1 block";

const StockForm: React.FC<StockFormProps> = ({ initialItem, onSave, onCancel }) => {
    const [formData, setFormData] = useState(initialItem);
    const [newCost, setNewCost] = useState<string>('');
    const isEditMode = 'id' in initialItem;

    // Always include id in edit mode for onSave
    const getFinalData = () => {
        let finalData: StockItem | Omit<StockItem, 'id'> = { ...formData };
        if (isEditMode && (initialItem as any).id) {
            (finalData as any).id = (initialItem as any).id;
        }
        if (isEditMode && newCost !== '' && !isNaN(Number(newCost))) {
            finalData.costPerUnit = Number(newCost);
        }
        // Debug log for id propagation
        console.log('[StockForm] getFinalData:', finalData);
        return finalData;
    };

    useEffect(() => {
        setFormData(initialItem);
        setNewCost('');
    }, [initialItem]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['quantity', 'costPerUnit', 'lowStockThreshold', 'sellingPrice'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name || !formData.unit) {
            alert("Please fill in all required fields.");
            return;
        }
        const data = getFinalData();
        console.log('[StockForm] handleSubmit, sending to onSave:', data);
        onSave(data);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelStyle}>Item Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputStyle} required/>
            </div>
             <div>
                <label className={labelStyle}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className={inputStyle}>
                    {Object.values(StockCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelStyle}>Quantity</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className={inputStyle} min="0" readOnly={isEditMode} />
                </div>
                 <div>
                    <label className={labelStyle}>Unit</label>
                    <select name="unit" value={formData.unit} onChange={handleChange} className={inputStyle} required>
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="pack">pack</option>
                    </select>
                </div>
            </div>
             
            {isEditMode ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Current Cost Per Unit (₹)</label>
                            <input type="number" value={Number(formData.costPerUnit).toFixed(2)} className={`${inputStyle} bg-slate-200 cursor-not-allowed`} readOnly />
                        </div>
                        <div>
                            <label className={labelStyle}>Low Stock Threshold</label>
                            <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} className={inputStyle} min="0"/>
                        </div>
                    </div>
                    <div>
                        <label className={labelStyle}>New Cost Per Unit (Optional)</label>
                        <input type="number" name="newCost" value={newCost} onChange={(e) => setNewCost(e.target.value)} className={inputStyle} min="0" step="0.01" placeholder="Enter new cost to update"/>
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Cost Per Unit (₹)</label>
                        <input type="number" name="costPerUnit" value={Number(formData.costPerUnit).toFixed(2)} onChange={handleChange} className={inputStyle} min="0" step="0.01"/>
                    </div>
                    <div>
                        <label className={labelStyle}>Low Stock Threshold</label>
                        <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} className={inputStyle} min="0"/>
                    </div>
                </div>
            )}
            
            {formData.category === StockCategory.FinishedProduct && (
                 <div>
                    <label className={labelStyle}>Selling Price (₹)</label>
                    <input type="number" name="sellingPrice" value={formData.sellingPrice || ''} onChange={handleChange} className={inputStyle} min="0" step="0.01"/>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
                 <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors">Save Item</button>
            </div>
        </form>
    );
}

export default StockForm;