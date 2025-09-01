
import React from 'react';
import { MenuIcon } from './Icons';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="md:hidden bg-brand-surface border-b border-brand-border p-4 flex items-center justify-between sticky top-0 z-30">
      <h1 className="text-lg font-bold text-brand-text">Whisk & Whisk</h1>
      <button onClick={onMenuClick} className="p-2 rounded-md text-brand-text-secondary hover:bg-brand-bg">
        <MenuIcon className="w-6 h-6" />
      </button>
    </header>
  );
};

export default Header;