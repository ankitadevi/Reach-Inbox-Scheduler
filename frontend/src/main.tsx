import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.js';
import App from './App.js';
import './index.css';

const googleClientId =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '1038484930291-exampleclientidforreachinboxdemo.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
