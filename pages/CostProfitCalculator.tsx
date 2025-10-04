// Helper fetch wrapper to handle 401 and redirect to login
const fetchWithAuth = async (url: string, options: any = {}) => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res;
};
import React, { useState, useMemo, useEffect } from 'react';
import { Recipe, StockItem, StockCategory } from '../types';
import Modal from '../components/Modal';
import RecipeForm from '../components/RecipeForm';
import { EditIcon, DeleteIcon, SearchIcon, PlusIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

const newRecipeTemplate: Omit<Recipe, 'id'> = {
  name: '',
  ingredients: [],
  sellingPrice: 0,
};

const CostProfitCalculator: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | Omit<Recipe, 'id'> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const { token } = useAuth();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };
        const skip = (page - 1) * PAGE_SIZE;
        const params = new URLSearchParams({
          skip: String(skip),
          limit: String(PAGE_SIZE),
          search: searchTerm,
        });
        
        const [recipesRes, stockRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/api/recipes?${params.toString()}`, { headers }),
          fetch(`${API_URL}/api/stock_items_public?limit=1000`)
        ]);
        
        const recipesDataRaw = await recipesRes.json();
        const stockData = await stockRes.json();
        
        const recipesArr = Array.isArray(recipesDataRaw) ? recipesDataRaw : recipesDataRaw.results || [];
        setRecipes(recipesArr.map((r: any) => ({ ...r, id: r._id ? String(r._id) : r.id })));
        setTotal(recipesDataRaw.total || recipesArr.length);
        
        // Show ALL stock items without filtering
        const allStockItems = (stockData.results || []).map((item: any) => ({ 
          ...item, 
          id: item._id ? String(item._id) : item.id 
        }));
        
        setStockItems(allStockItems);
        
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchAllData();
    }
  }, [token, page, searchTerm]);

  // No longer filter client-side, backend search is used
  const filteredRecipes = recipes;

  useEffect(() => {
    // Always select the first recipe if none selected or if current is not in filtered list
    if (filteredRecipes.length > 0 && (!selectedRecipe || !filteredRecipes.find(r => r.id === selectedRecipe.id))) {
      setSelectedRecipe(filteredRecipes[0]);
    } else if (filteredRecipes.length === 0) {
      setSelectedRecipe(null);
    }
  }, [filteredRecipes, selectedRecipe]);

  const recipeDetails = useMemo(() => {
    if (!selectedRecipe) return null;

    const cost = selectedRecipe.ingredients.reduce((total, ingredient) => {
      const stockItem = stockItems.find(item => item.id === ingredient.stockItemId);
      if (stockItem) {
        return total + stockItem.costPerUnit * ingredient.quantity;
      }
      return total;
    }, 0);

    const profit = selectedRecipe.sellingPrice - cost;
    const margin = selectedRecipe.sellingPrice > 0 ? (profit / selectedRecipe.sellingPrice) * 100 : 0;

    return { cost, profit, margin };
  }, [selectedRecipe, stockItems]);

  const handleRecalculateRecipe = async (recipe: Recipe) => {
    if (!window.confirm('This will update the recipe cost with current stock prices. Continue?')) {
      return;
    }

    try {
      // Fetch latest stock data
      const stockRes = await fetch(`${API_URL}/api/stock_items_public?limit=1000`);
      const stockData = await stockRes.json();
      const latestStockItems = (stockData.results || []).map((item: any) => ({ 
        ...item, 
        id: item._id ? String(item._id) : item.id 
      }));

      // Calculate new cost with latest prices
      const newCost = recipe.ingredients.reduce((total, ingredient) => {
        const stockItem = latestStockItems.find((item: any) => item.id === ingredient.stockItemId);
        if (stockItem) {
          return total + stockItem.costPerUnit * ingredient.quantity;
        }
        return total;
      }, 0);

      // Show comparison dialog
      const currentCost = recipe.ingredients.reduce((total, ingredient) => {
        const stockItem = stockItems.find(item => item.id === ingredient.stockItemId);
        if (stockItem) {
          return total + stockItem.costPerUnit * ingredient.quantity;
        }
        return total;
      }, 0);

      const costDifference = newCost - currentCost;
      const costChangePercent = currentCost > 0 ? (costDifference / currentCost) * 100 : 0;
      
      const confirmMessage = `Cost Recalculation for "${recipe.name}":
      
Previous Cost: ₹${currentCost.toFixed(2)}
New Cost: ₹${newCost.toFixed(2)}
Difference: ${costDifference >= 0 ? '+' : ''}₹${costDifference.toFixed(2)} (${costChangePercent >= 0 ? '+' : ''}${costChangePercent.toFixed(1)}%)

This is just a preview. The recipe cost will be updated in the display.
Continue to refresh with latest prices?`;

      if (window.confirm(confirmMessage)) {
        // Update local stock items with latest data
        setStockItems(latestStockItems);
        alert(`Recipe "${recipe.name}" has been recalculated with latest stock prices!`);
      }
      
    } catch (error) {
      console.error('Error recalculating recipe:', error);
      alert('Failed to recalculate recipe costs. Please try again.');
    }
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm('This will refresh all recipe costs with current stock prices for all recipes. Continue?')) {
      return;
    }

    try {
      // Fetch latest stock data
      const stockRes = await fetch(`${API_URL}/api/stock_items_public?limit=1000`);
      const stockData = await stockRes.json();
      const latestStockItems = (stockData.results || []).map((item: any) => ({ 
        ...item, 
        id: item._id ? String(item._id) : item.id 
      }));

      // Update stock items state
      setStockItems(latestStockItems);
      
      alert(`All recipes have been refreshed with latest stock prices! (${latestStockItems.length} items updated)`);
      
    } catch (error) {
      console.error('Error recalculating all recipes:', error);
      alert('Failed to refresh stock prices. Please try again.');
    }
  };
  
  const handleOpenCreateModal = () => {
    setEditingRecipe({ ...newRecipeTemplate }); // no id for new
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (recipe: Recipe) => {
    // Always pass id for edit
  setEditingRecipe({ ...recipe, id: recipe.id ?? (recipe as any)._id });
    setIsModalOpen(true);
  };
  
  const handleDeleteRecipe = async (recipeId: string) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
    await fetchWithAuth(`${API_URL}/api/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
        // Reload recipes from backend after delete
        const headers = { 'Authorization': `Bearer ${token}` };
  const recipesRes = await fetchWithAuth(`${API_URL}/api/recipes`, { headers });
  const recipesData = await recipesRes.json();
  const recipesArr = Array.isArray(recipesData) ? recipesData : recipesData.results || [];
  setRecipes(recipesArr.map((r: any) => ({ ...r, id: r._id ? String(r._id) : r.id })));
        // The useEffect will handle re-selection
      } catch (error) {
        console.error("Error deleting recipe:", error);
      }
    }
  };

  const handleSaveRecipe = async (recipeData: Recipe | Omit<Recipe, 'id'>) => {
  const isUpdate = 'id' in recipeData && recipeData.id;
  const method = isUpdate ? 'PUT' : 'POST';
  const url = isUpdate ? `${API_URL}/api/recipes/${recipeData.id}` : `${API_URL}/api/recipes`;

  // Remove id from body for PUT (backend expects no id in body)
  const bodyData = { ...recipeData };
  if (isUpdate) delete (bodyData as any).id;

  try {
  const response = await fetchWithAuth(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(bodyData)
  });
    if (!response.ok) throw new Error('Failed to save recipe');
    const savedRecipe = await response.json();

    // Reload recipes from backend after save, mapping _id to id
    const headers = { 'Authorization': `Bearer ${token}` };
  const recipesRes = await fetchWithAuth(`${API_URL}/api/recipes`, { headers });
  const recipesData = await recipesRes.json();
  const recipesArr = Array.isArray(recipesData) ? recipesData : recipesData.results || [];
  setRecipes(recipesArr.map((r: any) => ({ ...r, id: r._id ? String(r._id) : r.id })));
  setSelectedRecipe({ ...savedRecipe, id: savedRecipe._id ? String(savedRecipe._id) : savedRecipe.id });
  } catch (error) {
    console.error("Error saving recipe:", error);
  } finally {
    setIsModalOpen(false);
    setEditingRecipe(null);
  }
  };
  
  if (loading) return <div className="text-center p-10">Loading Recipes...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-brand-text">Cost & Profit Calculator</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-brand-sidebar border border-brand-border rounded-xl p-4 shadow-lg h-fit">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg">Recipes</h2>
            <div className="flex gap-2">
              <button 
                onClick={handleRecalculateAll} 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs transition-colors"
                title="Refresh all recipes with latest stock prices"
              >
                ↻ Refresh Prices
              </button>
              <button onClick={handleOpenCreateModal} className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-1 px-3 rounded-lg text-sm transition-colors flex items-center gap-1">
                <PlusIcon className="w-4 h-4" /> New
              </button>
            </div>
          </div>
           <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full bg-brand-surface border border-brand-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
          </div>
          {/* Pagination Controls */}
<div className="flex justify-center items-center gap-2 mb-2">
  <button
    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
    onClick={() => setPage(page - 1)}
    disabled={page <= 1}
  >Previous</button>
  {Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i + 1).map(p => (
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
    disabled={page >= Math.ceil(total / PAGE_SIZE)}
  >Next</button>
</div>
          <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
            {filteredRecipes.map(recipe => (
              <li key={recipe.id} 
                  className={`group w-full flex justify-between items-center rounded-lg transition-colors ${selectedRecipe?.id === recipe.id ? 'bg-brand-primary text-white' : 'hover:bg-brand-surface'}`}>
                <button
                  onClick={() => setSelectedRecipe(recipe)}
                  className="flex-grow text-left p-3"
                >
                  {recipe.name}
                </button>
                <div className={`pr-3 flex gap-2 items-center transition-opacity duration-200 ${selectedRecipe?.id === recipe.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecalculateRecipe(recipe);
                      }} 
                      className="p-1 rounded-full hover:bg-white/20"
                      title="Recalculate with latest prices"
                    >
                      <span className="w-4 h-4 flex items-center justify-center text-xs">↻</span>
                    </button>
                    <button onClick={() => handleOpenEditModal(recipe)} className="p-1 rounded-full hover:bg-white/20"><EditIcon className="w-4 h-4"/></button>
          <button onClick={() => {
            const id = recipe.id ?? recipe._id;
            if (id) handleDeleteRecipe(id);
            else alert('Recipe ID is missing!');
          }} className="p-1 rounded-full hover:bg-white/20"><DeleteIcon className="w-4 h-4"/></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2 bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg">
          {selectedRecipe && recipeDetails ? (
            <div>
              <h2 className="text-2xl font-bold text-brand-primary mb-4">{selectedRecipe.name}</h2>
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2 border-b border-brand-border pb-2">Ingredients</h3>
                <ul className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {selectedRecipe.ingredients.map(ing => {
                    const item = stockItems.find(si => si.id === ing.stockItemId);
                    return (
                      <li key={ing.stockItemId} className="flex justify-between p-2 rounded bg-brand-surface">
                        <span>{item?.name || 'Unknown Item'}</span>
                        <span className="text-brand-text-secondary">{ing.quantity} {item?.unit}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                  <div className="bg-brand-surface p-4 rounded-lg">
                    <p className="text-sm text-brand-text-secondary">Total Cost</p>
                    <p className="text-2xl font-bold text-red-400">₹{recipeDetails.cost.toFixed(2)}</p>
                  </div>
                   <div className="bg-brand-surface p-4 rounded-lg">
                    <p className="text-sm text-brand-text-secondary">Selling Price</p>
                    <p className="text-2xl font-bold text-brand-accent">₹{selectedRecipe.sellingPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-brand-surface p-4 rounded-lg">
                    <p className="text-sm text-brand-text-secondary">Profit</p>
                    <p className="text-2xl font-bold text-green-400">₹{recipeDetails.profit.toFixed(2)}</p>
                  </div>
              </div>
               <div className="mt-6">
                    <p className="text-center text-lg text-brand-text-secondary">Profit Margin</p>
                    <div className="w-full bg-brand-surface rounded-full h-4 mt-2">
                        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary h-4 rounded-full" style={{ width: `${Math.max(0, recipeDetails.margin)}%` }}></div>
                    </div>
                    <p className="text-center text-3xl font-bold mt-2">{recipeDetails.margin.toFixed(2)}%</p>
                </div>
            </div>
          ) : (
            <div className="text-center py-20 text-brand-text-secondary">
              <p>Select a recipe to see details or create a new one.</p>
            </div>
          )}
        </div>
      </div>
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingRecipe && 'id' in editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
        size="4xl"
       >
        {editingRecipe && (
            <RecipeForm 
                initialRecipe={editingRecipe}
                stockItems={stockItems}
                onSave={handleSaveRecipe}
                onCancel={() => setIsModalOpen(false)}
            />
        )}
      </Modal>
    </div>
  );
};

export default CostProfitCalculator;