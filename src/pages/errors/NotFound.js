import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <div className="error-title">Page Not Found</div>
      <p>The page you're looking for doesn't exist.</p>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
    </div>
  );
}
