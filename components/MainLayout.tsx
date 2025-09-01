
import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, Transition } from 'framer-motion';

import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../pages/Dashboard';
import Billing from '../pages/Billing';
import StockManagement from '../pages/StockManagement';
import CostProfitCalculator from '../pages/CostProfitCalculator';
import Customers from '../pages/Customers';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5,
};

const AnimatedRoutes: React.FC = () => {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/stock" element={<StockManagement />} />
                <Route path="/calculator" element={<CostProfitCalculator />} />
                <Route path="/customers" element={<Customers />} />
            </Routes>
        </AnimatePresence>
    );
};

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
      <div className="flex h-screen bg-brand-bg font-sans">
        <Sidebar isMobileOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AnimatedRoutes />
              </motion.div>
            </main>
        </div>
      </div>
  );
};

export default MainLayout;
