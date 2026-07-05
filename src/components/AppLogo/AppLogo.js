import React from 'react';
import './AppLogo.css';

const LOGO_SRC = `${process.env.PUBLIC_URL || ''}/logo.png`;

export default function AppLogo({ size = 48, className = '', alt = 'Defoex' }) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`app-logo ${className}`.trim()}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
