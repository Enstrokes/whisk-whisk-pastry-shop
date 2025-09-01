
import React from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_LINKS } from '../constants';
import { LogoIcon, LogoutIcon } from './Icons';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

const SidebarContent: React.FC<{onLinkClick?: () => void}> = ({ onLinkClick }) => {
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        if (onLinkClick) {
            onLinkClick();
        }
    };
    
    return (
        <>
            <div className="flex items-center gap-3 mb-10">
                <LogoIcon className="w-10 h-10 text-brand-primary" />
                <h1 className="text-xl font-bold text-brand-text">Whisk & Whisk</h1>
            </div>
            <nav className="flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={onLinkClick}
                    className={({ isActive }) =>
                    `flex items-center gap-4 p-3 rounded-lg transition-all duration-200 ${
                        isActive
                        ? 'bg-brand-primary text-white shadow-lg'
                        : 'text-brand-text-secondary hover:bg-brand-surface hover:text-brand-text'
                    }`
                    }
                >
                    <link.icon className="w-6 h-6" />
                    <span className="font-medium">{link.label}</span>
                </NavLink>
                ))}
            </nav>
            <div className="mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 p-3 rounded-lg transition-all duration-200 w-full text-brand-text-secondary hover:bg-red-500/10 hover:text-red-500"
                >
                    <LogoutIcon className="w-6 h-6" />
                    <span className="font-medium">Logout</span>
                </button>
                <div className="p-4 bg-brand-surface rounded-lg text-center mt-4">
                    <p className="text-sm text-brand-text-secondary">Whisk & Whisk Pastry Shop</p>
                    <p className="text-xs text-brand-text-secondary/70 mt-1">&copy; 2024. All rights reserved.</p>
                </div>
            </div>
        </>
    );
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  return (
    <>
        {/* Desktop Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-brand-sidebar p-6 hidden md:flex flex-col">
            <SidebarContent />
        </aside>
        
        {/* Mobile Sidebar */}
        <AnimatePresence>
            {isMobileOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={onClose}
                    />
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-0 left-0 h-full w-64 bg-brand-sidebar p-6 flex flex-col z-50 md:hidden"
                    >
                        <SidebarContent onLinkClick={onClose} />
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    </>
  );
};

export default Sidebar;