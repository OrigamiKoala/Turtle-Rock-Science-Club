import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  hideText?: boolean;
}

export default function TurtleRockLogo({ className = '', size = 120, hideText = false }: LogoProps) {
  if (hideText) {
    return (
      <div 
        className={`relative overflow-hidden rounded-full flex items-center justify-center shrink-0 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        id="turtle-rock-cropped-logo"
      >
        <img
          src={`${import.meta.env.BASE_URL}Logo.png`}
          alt="Turtle Rock Science Club Icon"
          className="absolute max-w-none select-none pointer-events-none"
          referrerPolicy="no-referrer"
          style={{
            width: `${size * 1.6}px`,
            height: `${size * 1.6}px`,
            transform: 'scale(1.05)', // Cropped past the circular text ring to focus on the turtle & beaker
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}Logo.png`}
      alt="Turtle Rock Science Club Logo"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={`select-none pointer-events-none object-contain shrink-0 ${className}`}
      id="turtle-rock-png-logo"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
