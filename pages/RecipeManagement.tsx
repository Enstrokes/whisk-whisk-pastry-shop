import { fetchWithAuth } from '../utils/fetchWithAuth';
import React, { useEffect, useState } from 'react';
import RecipeForm from '../components/RecipeForm';
import { Recipe, StockItem } from '../types';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

const RecipeManagement: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | Omit<Recipe, 'id'> | null>(null);
  const { token } = useAuth();

  // Fetch recipes and stock items
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [recipesRes, stockRes] = await Promise.all([
  fetchWithAuth(`${API_URL}/api/recipes`, { headers: { 'Authorization': `Bearer ${token}` } }),
  fetchWithAuth(`${API_URL}/api/stock_items`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const recipesData = await recipesRes.json();
      const stockData = await stockRes.json();
  setRecipes(recipesData.map((r: any) => ({ ...r, id: r._id || r.id })));
  setStockItems(stockData.map((s: any) => ({ ...s, id: s._id ? String(s._id) : s.id })));
    } catch (e) {
      console.error('Failed to fetch recipes or stock items', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const handleSaveRecipe = async (recipeData: Recipe | Omit<Recipe, 'id'>) => {
    const isUpdate = 'id' in recipeData && recipeData.id;
    let url = `${API_URL}/api/recipes`;
    let method: 'POST' | 'PUT' = 'POST';
    let body = { ...recipeData };
    if (isUpdate) {
      url = `${API_URL}/api/recipes/${recipeData.id}`;
      method = 'PUT';
      const { id, ...rest } = recipeData as Recipe;
      body = rest;
    }
    try {
  const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error('Failed to save recipe');
      await fetchAll();
    } catch (e) {
      console.error('Error saving recipe:', e);
    } finally {
      setFormModalOpen(false);
      setSelectedRecipe(null);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!recipeId) return;
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    try {
  const response = await fetchWithAuth(`${API_URL}/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete recipe');
      await fetchAll();
    } catch (e) {
      console.error('Error deleting recipe:', e);
    }
  };

  if (loading) return <div className="text-center p-10">Loading Recipes...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-brand-text">Recipe Management</h1>
        <button onClick={() => { setSelectedRecipe({ name: '', ingredients: [], sellingPrice: 0 }); setFormModalOpen(true); }} className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          + Create Recipe
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-brand-surface">
            <tr>
              <th className="p-4 font-semibold">Recipe Name</th>
              <th className="p-4 font-semibold">Ingredients</th>
              <th className="p-4 font-semibold">Selling Price (₹)</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map(recipe => (
              <tr key={recipe.id} className="border-t border-brand-border">
                <td className="p-4 font-medium">{recipe.name}</td>
                <td className="p-4">
                  {recipe.ingredients.map((ing, idx) => {
                    const stock = stockItems.find(s => s.id === ing.stockItemId);
                    return stock ? (
                      <span key={idx}>{stock.name} ({ing.quantity} {stock.unit}){idx < recipe.ingredients.length - 1 ? ', ' : ''}</span>
                    ) : null;
                  })}
                </td>
                <td className="p-4">{Number(recipe.sellingPrice).toFixed(2)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => { setSelectedRecipe(recipe); setFormModalOpen(true); }} className="p-2 text-brand-text-secondary hover:text-yellow-400" aria-label="Edit">Edit</button>
                  <button onClick={() => handleDeleteRecipe(recipe.id!)} className="p-2 text-brand-text-secondary hover:text-red-500" aria-label="Delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={selectedRecipe && 'id' in selectedRecipe ? 'Edit Recipe' : 'Create Recipe'}>
        {selectedRecipe && (
          <RecipeForm
            initialRecipe={selectedRecipe}
            stockItems={stockItems}
            onSave={handleSaveRecipe}
            onCancel={() => setFormModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default RecipeManagement;
