import React from 'react';

interface LabelProps {
    children: React.ReactNode;
    className?: string;
}

export function Label({ children, className = '' }: LabelProps) {
    return (
        <span className={`text-sm text-[#4A4235] ${className}`}>
            {children}
        </span>
    );
} 