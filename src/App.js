import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

// Theme + Global
import './theme/variables.css';
import './theme/global.css';
import './theme/responsive.css';
import './components/Field/Field.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.83rem',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(13,27,62,0.15)',
            },
            success: { iconTheme: { primary: '#00c853', secondary: '#fff' } },
            error: { iconTheme: { primary: '#d50000', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
