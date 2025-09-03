import { fetchWithAuth } from '../utils/fetchWithAuth';
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

import Card from '../components/Card';
import { SalesIcon, LowStockIcon, BirthdayIcon, ProfitIcon } from '../components/Icons';
import { StockCategory, StockItem, Invoice, Customer, Recipe } from '../types';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:8000';

const Dashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [invoicesRes, stockRes, customersRes, recipesRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/api/invoices`, { headers }),
          fetchWithAuth(`${API_URL}/api/stock_items`, { headers }),
          fetchWithAuth(`${API_URL}/api/customers`, { headers }),
          fetchWithAuth(`${API_URL}/api/recipes`, { headers }),
        ]);

        setInvoices(await invoicesRes.json());
        setStockItems(await stockRes.json());
        setCustomers(await customersRes.json());
        setRecipes(await recipesRes.json());

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
        fetchData();
    }
  }, [token]);

  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices
      .filter(inv => inv.date === today)
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const lowStockItems = useMemo(() => {
    return stockItems.filter(item => item.quantity <= item.lowStockThreshold).length;
  }, [stockItems]);

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return customers.filter(customer => {
        const birthday = new Date(customer.birthday);
        birthday.setFullYear(today.getFullYear());
        return birthday >= today && birthday <= nextWeek;
    }).length;
  }, [customers]);

  const averageProfitMargin = useMemo(() => {
    let totalProfit = 0;
    let totalRevenue = 0;
    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const recipe = recipes.find(r => r.id === item.productId);
        if (recipe) {
          const cost = recipe.ingredients.reduce((acc, ing) => {
            const stockItem = stockItems.find(s => s.id === ing.stockItemId);
            return acc + (stockItem ? stockItem.costPerUnit * ing.quantity : 0);
          }, 0);
          totalProfit += (item.price - cost) * item.quantity;
          totalRevenue += item.price * item.quantity;
        }
      });
    });
    return totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
  }, [invoices, recipes, stockItems]);

  const weeklySalesData = useMemo(() => {
    return Array(7).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];
      const total = invoices
        .filter(inv => inv.date === dateStr)
        .reduce((sum, inv) => sum + inv.total, 0);
      return { name: day, Sales: total };
    }).reverse();
  }, [invoices]);

  const stockByCategoryData = useMemo(() => {
    const categoryCounts: { [key: string]: number } = {
        [StockCategory.Ingredient]: 0,
        [StockCategory.FinishedProduct]: 0,
        [StockCategory.Packaging]: 0,
    };
    stockItems.forEach(item => {
      if(item.category in categoryCounts) {
        categoryCounts[item.category]++;
      }
    });
    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  }, [stockItems]);

  const COLORS = ['#6B46C1', '#9F7AEA', '#38B2AC'];

  if(loading) {
    return <div className="text-center p-10">Loading Dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-brand-text">Dashboard</h1>
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }}
      >
        <Card title="Today's Sales" value={`₹${todaySales.toFixed(2)}`} icon={SalesIcon} color="#30C5FF" />
        <Card title="Low Stock Items" value={lowStockItems.toString()} icon={LowStockIcon} color="#F4A261" />
        <Card title="Upcoming Birthdays" value={upcomingBirthdays.toString()} icon={BirthdayIcon} color="#E76F51" />
        <Card title="Average Profit Margin" value={`${averageProfitMargin.toFixed(2)}%`} icon={ProfitIcon} color="#2A9D8F" />
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
        <div className="lg:col-span-3 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-brand-text">Weekly Sales Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklySalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#718096" />
              <YAxis stroke="#718096" tickFormatter={(value) => `₹${value}`} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }} itemStyle={{ color: '#1A202C' }} labelStyle={{ color: '#718096' }} formatter={(value: number) => `₹${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Sales" fill="#6B46C1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-brand-text">Stock by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stockByCategoryData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {stockByCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '0.5rem' }} itemStyle={{ color: '#1A202C' }} labelStyle={{ color: '#718096' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;