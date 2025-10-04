
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, StockItem, RecipeIngredient } from '../types';
import { XCircleIcon, PlusIcon, SearchIcon } from './Icons';

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
    const [ingredientSearchTerms, setIngredientSearchTerms] = useState<string[]>([]);
    const [showDropdowns, setShowDropdowns] = useState<boolean[]>([]);

    // All available items without any filtering
    const availableItems = useMemo(() => {
        return stockItems; // Return all items without filtering
    }, [stockItems]);

    // Initialize search terms and dropdown states
    useEffect(() => {
        setFormData(initialRecipe);
        const searchTerms = initialRecipe.ingredients.map(ing => {
            const item = availableItems.find(item => String(item.id || (item as any)._id) === String(ing.stockItemId));
            return item ? `${item.name} (${item.unit})` : '';
        });
        setIngredientSearchTerms(searchTerms);
        setShowDropdowns(new Array(initialRecipe.ingredients.length).fill(false));
    }, [initialRecipe, availableItems]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as Element)?.closest('.ingredient-dropdown')) {
                setShowDropdowns(new Array(formData.ingredients.length).fill(false));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [formData.ingredients.length]);

    // Calculate manufacturing cost
    const manufacturingCost = useMemo(() => {
        const cost = formData.ingredients.reduce((total, ingredient) => {
            const stockItem = availableItems.find(item => 
                String(item.id ?? (item as any)._id) === String(ingredient.stockItemId)
            );
            if (stockItem) {
                const costPerUnit = Number(stockItem.costPerUnit ?? (stockItem as any).unitCost ?? 0);
                const qty = Number(ingredient.quantity);
                return total + (costPerUnit * qty);
            }
            return total;
        }, 0);
        return Math.round(cost * 100) / 100;
    }, [formData.ingredients, availableItems]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'sellingPrice') {
            // Handle selling price - allow empty values
            if (value === '') {
                setFormData(prev => ({ ...prev, [name]: '' }));
            } else {
                const numericValue = Number(value);
                setFormData(prev => ({ ...prev, [name]: isNaN(numericValue) ? '' : numericValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: string | number) => {
        setFormData(prev => {
            const newIngredients = prev.ingredients.map((ing, i) => {
                if (i === index) {
                    if (field === 'quantity') {
                        // Handle quantity - allow empty values
                        if (value === '' || value === null || value === undefined) {
                            return { ...ing, [field]: '' };
                        } else {
                            const numericValue = Number(value);
                            return { ...ing, [field]: isNaN(numericValue) ? '' : numericValue };
                        }
                    } else {
                        return { ...ing, [field]: value };
                    }
                } else {
                    return ing;
                }
            });
            return { ...prev, ingredients: newIngredients };
        });
    };

    const handleSearchChange = (index: number, searchTerm: string) => {
        const newSearchTerms = [...ingredientSearchTerms];
        newSearchTerms[index] = searchTerm;
        setIngredientSearchTerms(newSearchTerms);
        
        const newShowDropdowns = [...showDropdowns];
        newShowDropdowns[index] = true;
        setShowDropdowns(newShowDropdowns);
    };

    const selectIngredient = (index: number, item: StockItem) => {
        handleIngredientChange(index, 'stockItemId', String(item.id || (item as any)._id || ''));
        
        const newSearchTerms = [...ingredientSearchTerms];
        newSearchTerms[index] = `${item.name} (${item.unit})`;
        setIngredientSearchTerms(newSearchTerms);
        
        const newShowDropdowns = [...showDropdowns];
        newShowDropdowns[index] = false;
        setShowDropdowns(newShowDropdowns);
    };

    const getFilteredItems = (searchTerm: string) => {
        if (!searchTerm || searchTerm.trim() === '') {
            // Show all items when search is empty, sorted by category and name for better UX
            return [...availableItems].sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return a.name.localeCompare(b.name);
            });
        }
        
        const term = searchTerm.toLowerCase();
        return availableItems.filter(item =>
            item.name.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term) ||
            item.unit.toLowerCase().includes(term)
        );
    };

    const addIngredient = () => {
        const newIndex = formData.ingredients.length;
        
        setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { stockItemId: '', quantity: 0 }]
        }));
        setIngredientSearchTerms(prev => [...prev, '']);
        setShowDropdowns(prev => [...prev, true]); // Show dropdown for new item immediately
        
        // Focus the new input after a brief delay
        setTimeout(() => {
            const inputs = document.querySelectorAll('.ingredient-dropdown input');
            const newInput = inputs[newIndex] as HTMLInputElement;
            if (newInput) {
                newInput.focus();
            }
        }, 100);
    };

    const removeIngredient = (index: number) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
        setIngredientSearchTerms(prev => prev.filter((_, i) => i !== index));
        setShowDropdowns(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert('Please enter a recipe name.');
            return;
        }
        
        if (formData.ingredients.length === 0) {
            alert('Please add at least one ingredient.');
            return;
        }
        
        const invalidIngredients = formData.ingredients.some(ing => 
            !ing.stockItemId || ing.quantity <= 0
        );
        
        if (invalidIngredients) {
            alert('Please ensure all ingredients are selected and have a quantity greater than 0.');
            return;
        }
        
        onSave(formData);
    };

    const getCategoryColor = (category: string) => {
        const cat = category.toLowerCase();
        if (cat === 'packaging') return 'bg-green-100 text-green-800';
        if (cat === 'finished product') return 'bg-purple-100 text-purple-800';
        if (cat === 'ingredient') return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className={labelStyle}>Recipe Name *</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        className={inputStyle} 
                        required
                        placeholder="Enter recipe name"
                    />
                </div>
                <div>
                    <label className={labelStyle}>Manufacturing Cost (₹)</label>
                    <input 
                        type="text" 
                        value={`₹${manufacturingCost.toFixed(2)}`} 
                        className={`${inputStyle} bg-slate-200 cursor-not-allowed`} 
                        readOnly
                    />
                </div>
                <div>
                    <label className={labelStyle}>Selling Price (₹) *</label>
                    <input 
                        type="number" 
                        name="sellingPrice" 
                        value={formData.sellingPrice === 0 ? '' : formData.sellingPrice} 
                        onChange={handleInputChange} 
                        className={inputStyle} 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00"
                        required
                    />
                </div>
            </div>
            
            {/* Items Section */}
            <div className="overflow-visible">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Recipe Items</h3>
                    <div className="text-sm text-brand-text-secondary">
                        {availableItems.length} items available
                    </div>
                </div>
                
                <div className="space-y-4 overflow-visible pr-2" style={{ maxHeight: 'none' }}>
                    {formData.ingredients.map((ing, index) => {
                        const stock = availableItems.find(item => 
                            String(item.id || (item as any)._id) === String(ing.stockItemId)
                        );
                        const filteredItems = getFilteredItems(ingredientSearchTerms[index] || '');
                        
                        return (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px_50px] gap-4 items-start p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                {/* Item Selector */}
                                <div className="relative ingredient-dropdown" style={{ zIndex: 1000 - index }}>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            value={ingredientSearchTerms[index] || ''}
                                            onChange={(e) => handleSearchChange(index, e.target.value)}
                                            onFocus={() => {
                                                const newShowDropdowns = [...showDropdowns];
                                                newShowDropdowns[index] = true;
                                                setShowDropdowns(newShowDropdowns);
                                            }}
                                            onClick={() => {
                                                const newShowDropdowns = [...showDropdowns];
                                                newShowDropdowns[index] = true;
                                                setShowDropdowns(newShowDropdowns);
                                            }}
                                            placeholder="Search for any item..."
                                            className={`${inputStyle} pl-10`}
                                        />
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary" />
                                    </div>
                                    
                                    {showDropdowns[index] && (
                                        <div 
                                            className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-2xl mt-1"
                                            style={{ 
                                                zIndex: 9999,
                                                maxHeight: '300px',
                                                overflowY: 'auto'
                                            }}
                                        >
                                            {filteredItems.length === 0 ? (
                                                <div className="px-4 py-3 text-gray-500 text-center">
                                                    No items found matching "{ingredientSearchTerms[index]}"
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="sticky top-0 px-3 py-2 text-xs text-gray-600 border-b bg-gray-50 font-medium">
                                                        {filteredItems.length} item(s) available
                                                    </div>
                                                    <div>
                                                        {filteredItems.map((item, itemIndex) => (
                                                            <button
                                                                key={item.id || (item as any)._id}
                                                                type="button"
                                                                onClick={() => selectIngredient(index, item)}
                                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center group transition-colors"
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                                                    <div className="text-sm text-gray-500">Unit: {item.unit} • Cost: ₹{Number(item.costPerUnit || (item as any).unitCost || 0).toFixed(2)}</div>
                                                                </div>
                                                                <span className={`ml-3 text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(item.category)} flex-shrink-0`}>
                                                                    {item.category}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>                                
                                {/* Quantity Input */}
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-600 mb-1 font-medium">Quantity</label>
                                    <input 
                                        type="number" 
                                        value={ing.quantity === 0 ? '' : ing.quantity} 
                                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                        className={`${inputStyle} text-center`}
                                        min="0.001"
                                        step="any"
                                        placeholder="0"
                                    />
                                </div>
                                
                                {/* Unit Display */}
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-600 mb-1 font-medium">Unit</label>
                                    <div className="h-10 flex items-center justify-center bg-gray-100 rounded-lg text-sm text-gray-700 font-medium border border-gray-200">
                                        {stock?.unit || 'Unit'}
                                    </div>
                                </div>
                                
                                {/* Remove Button */}
                                <div className="flex items-center justify-center pt-6">
                                    <button 
                                        type="button" 
                                        onClick={() => removeIngredient(index)} 
                                        className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-full transition-colors"
                                        title="Remove item"
                                    >
                                        <XCircleIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <button 
                    type="button" 
                    onClick={addIngredient} 
                    className="mt-4 w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <PlusIcon className="w-4 h-4" /> 
                    Add Item
                </button>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    className="bg-brand-primary hover:bg-brand-secondary text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                    Save Recipe
                </button>
            </div>
        </form>
    );
};

export default RecipeForm;
