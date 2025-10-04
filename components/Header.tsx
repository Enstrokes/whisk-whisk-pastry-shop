
import React from 'react';
import { MenuIcon } from './Icons';

const AvatarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20c0-2.21 3.582-4 8-4s8 1.79 8 4" stroke="currentColor" strokeWidth="2" />
  </svg>
);

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="md:hidden bg-brand-surface border-b border-brand-border p-4 flex items-center justify-between sticky top-0 z-30">
      <h1 className="text-lg font-bold text-brand-text">Whisk & Whisk</h1>
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 rounded-md text-brand-text-secondary hover:bg-brand-bg">
          <MenuIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <AvatarIcon className="w-8 h-8 text-brand-primary bg-brand-surface rounded-full border border-brand-border" />
          <span className="text-sm text-brand-text font-medium">User</span>
        </div>
      </div>
    </header>
  );
};

export default Header;