
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StockItem, RecipeIngredient } from '../types';
import { XCircleIcon, PlusIcon } from './Icons';

interface RecipeFormProps {
    initialRecipe: Recipe | Omit<Recipe, 'id'>;
    stockItems: StockItem[];
    onSave: (recipe: Recipe | Omit<Recipe, 'id'>) => void;
    onCancel: () => void;
}

const inputStyle = "w-full bg-slate-100 border-transparent rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors";
const labelStyle = "text-sm text-brand-text-secondary mb-1 block";

const RecipeForm: React.FC<RecipeFormProps> = ({ initialRecipe, stockItems, onSave, onCancel }) => {
    const [formData, setFormData] = useState(initialRecipe);

    useEffect(() => {
        setFormData(initialRecipe);
    }, [initialRecipe]);

    const manufacturingCost = useMemo(() => {
        return formData.ingredients.reduce((total, ingredient) => {
            const stockItem = stockItems.find(item => item.id === ingredient.stockItemId);
            if (stockItem) {
                return total + stockItem.costPerUnit * ingredient.quantity;
            }
            return total;
        }, 0);
    }, [formData.ingredients, stockItems]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'sellingPrice' ? Number(value) : value }));
    }

    const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: string | number) => {
        const newIngredients = [...formData.ingredients];
        (newIngredients[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    }

    const addIngredient = () => {
        setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { stockItemId: '', quantity: 0 }]
        }));
    }

    const removeIngredient = (index: number) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || formData.ingredients.some(i => !i.stockItemId || i.quantity <= 0)) {
            alert('Please fill out the recipe name and ensure all ingredients are selected and have a quantity greater than 0.');
            return;
        }
        onSave(formData);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className={labelStyle}>Recipe Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputStyle} required/>
                </div>
                <div>
                    <label className={labelStyle}>Manufacturing Cost (₹)</label>
                    <input 
                        type="text" 
                        value={manufacturingCost.toFixed(2)} 
                        className={`${inputStyle} bg-slate-200 cursor-not-allowed`} 
                        readOnly
                    />
                </div>
                 <div>
                    <label className={labelStyle}>Selling Price (₹)</label>
                    <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleInputChange} className={inputStyle} min="0" step="0.01" required/>
                </div>
            </div>
            
            <div>
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {formData.ingredients.map((ing, index) => (
                        <div key={index} className="grid grid-cols-1 gap-2 items-center md:grid-cols-[1fr_100px_auto]">
                            <select 
                                value={ing.stockItemId} 
                                onChange={(e) => handleIngredientChange(index, 'stockItemId', e.target.value)} 
                                className={inputStyle}
                            >
                                <option value="">Select Ingredient</option>
                                {stockItems.map(item => (
                                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                ))}
                            </select>
                             <input 
                                type="number" 
                                value={ing.quantity} 
                                onChange={(e) => handleIngredientChange(index, 'quantity', Number(e.target.value))}
                                className={`${inputStyle} text-center`}
                                min="0.001"
                                step="any"
                             />
                            <button type="button" onClick={() => removeIngredient(index)} className="text-red-400 hover:text-red-600 justify-self-end md:justify-self-center">
                                <XCircleIcon className="w-6 h-6"/>
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addIngredient} className="mt-2 text-brand-primary font-semibold hover:text-brand-secondary text-sm flex items-center gap-1">
                    <PlusIcon className="w-4 h-4" /> Add Ingredient
                </button>
            </div>


            <div className="flex justify-end gap-3 pt-4 border-t">
                 <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                 <button type="submit" className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors">Save Recipe</button>
            </div>
        </form>
    );
};

export default RecipeForm;
