import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  icon, 
  size = 'md',
  className = '', 
  ...props 
}) => {
  // Base: Sharp corners (rounded-duck), solid border, font-mono for technical feel or sans for UI
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-100 rounded-duck border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-duck-border disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-3 py-1 text-xs",
    md: "px-5 py-2 text-sm"
  };

  const variants = {
    // Primary: Blue background, Dark text, Dark border
    primary: "bg-duck-blue text-duck-text border-duck-border hover:bg-[#5AB0F0] active:translate-y-[1px]",
    // Secondary: Off-white/Transparent background, Dark text, Dark border
    secondary: "bg-duck-bg text-duck-text border-duck-border hover:bg-white active:translate-y-[1px]",
    // Ghost: No border initially, acts like text link
    ghost: "border-transparent text-duck-text hover:bg-duck-hover hover:border-duck-border/20",
    // Icon: Square, border depends on context
    icon: "p-1.5 aspect-square border-transparent hover:bg-duck-hover hover:border-duck-border text-duck-text"
  };

  return (
    <button 
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className={size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4"}>{icon}</span>}
      {children}
    </button>
  );
};