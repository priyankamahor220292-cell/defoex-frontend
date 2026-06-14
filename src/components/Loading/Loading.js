import React from 'react';
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
      <div className="loader-logo">D</div>
      <div className="loader-bar"><div className="loader-progress" /></div>
    </div>
  );
}
