
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoIcon } from '../components/Icons';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <LogoIcon className="w-16 h-16 text-brand-primary mb-2" />
            <h1 className="text-2xl font-bold text-brand-text">Welcome to Whisk & Whisk</h1>
            <p className="text-brand-text-secondary mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-text-secondary">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md shadow-sm placeholder-brand-text-secondary/50 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                placeholder="admin@whiskandwhisk.com"
              />
            </div>

            <div>
              <label htmlFor="password"className="block text-sm font-medium text-brand-text-secondary">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md shadow-sm placeholder-brand-text-secondary/50 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                placeholder="password"
              />
            </div>
            
            {error && <p className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md">{error}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-brand-secondary/50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-brand-text-secondary">
            &copy; 2024 Whisk & Whisk Pastry Shop. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;