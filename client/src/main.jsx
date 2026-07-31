import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white dark:!bg-ink-800 !text-gray-800 dark:!text-gray-100 !rounded-xl !shadow-lg',
          duration: 3500,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
