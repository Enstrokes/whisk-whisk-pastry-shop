
import React from 'react';
// FIX: Updated to import from 'react-dom/client' for React 18's new root API.
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// FIX: Switched from the deprecated `ReactDOM.render` to the `createRoot` API for React 18. This resolves the error where 'render' was not found on ReactDOM.
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
