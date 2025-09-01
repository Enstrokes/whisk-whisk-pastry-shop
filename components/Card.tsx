import React from 'react';

interface CardProps {
  title: string;
  value: string;
  // FIX: Updated icon prop type to allow any SVG props, including 'style', which resolves the type error.
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, value, icon: Icon, color, children }) => {
  return (
    <div className="bg-brand-sidebar border border-brand-border rounded-xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-brand-text-secondary font-medium">{title}</p>
          <p className="text-3xl font-bold text-brand-text mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-7 h-7" style={{ color: color }} />
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default Card;