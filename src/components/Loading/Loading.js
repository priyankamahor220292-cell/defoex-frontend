import React from 'react';
import AppLogo from '../AppLogo/AppLogo';
import './Loading.css';

export default function Loading({ text = 'Loading...' }) {
  return (
    <div className="loading-wrap">
      <div className="loading-spinner" />
      <span>{text}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <AppLogo size={60} className="loader-logo" />
      <div className="loader-bar"><div className="loader-progress" /></div>
    </div>
  );
}
