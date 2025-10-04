import React, { useState } from 'react';
import { StockItem } from '../types';

interface AdjustStockFormProps {
    item: StockItem;
    onSave: (itemId: string, purchaseData: { quantity_added: number, cost_per_unit_of_purchase: number }) => void;
    onCancel: () => void;
}

const inputStyle = "w-full bg-slate-100 border-transparent rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors";

const AdjustStockForm: React.FC<AdjustStockFormProps> = ({ item, onSave, onCancel }) => {
    const [quantityAdded, setQuantityAdded] = useState('');
    const [costPerUnit, setCostPerUnit] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numQuantityAdded = Number(quantityAdded);
        const numCostPerUnit = Number(costPerUnit);
        if (numQuantityAdded <= 0 || numCostPerUnit < 0) {
            alert("Please enter a valid quantity and cost.");
            return;
        }
        onSave(item.id!, {
            quantity_added: numQuantityAdded,
            cost_per_unit_of_purchase: numCostPerUnit
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-brand-surface rounded-lg text-center">
                <p className="text-sm text-brand-text-secondary">Current Quantity</p>
                <p className="text-2xl font-bold">{item.quantity} {item.unit}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-brand-text-secondary mb-1 block">Quantity Added</label>
                    <input
                        type="number"
                        value={quantityAdded}
                        onChange={e => setQuantityAdded(e.target.value)}
                        className={inputStyle}
                        min="0.01"
                        step="any"
                        placeholder="0"
                        required
                    />
                </div>
                 <div>
                    <label className="text-sm text-brand-text-secondary mb-1 block">Cost Per Unit (₹)</label>
                    <input
                        type="number"
                        value={costPerUnit}
                        onChange={e => setCostPerUnit(e.target.value)}
                        className={inputStyle}
                        min="0"
                        step="any"
                        placeholder="0.00"
                        required
                    />
                </div>
            </div>

            <div className="p-4 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                <p className="text-sm text-green-700">New Total Quantity after Purchase</p>
                <p className="text-2xl font-bold text-green-600">{item.quantity + (Number(quantityAdded) || 0)} {item.unit}</p>
            </div>


            <div className="flex justify-end gap-3 pt-4 border-t">
                 <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors">Record Purchase</button>
            </div>
        </form>
    );
};

export default AdjustStockForm;