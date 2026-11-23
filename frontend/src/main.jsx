import React from 'react';
import ReactDOM from 'react-dom/client';
import PrimeReact from 'primereact/api';
import App from './App';

// Global PrimeReact Z-Index hierarchy
// MUI Dialog uses z-index 1300.
// Setting overlay to 9999 ensures PrimeReact Dropdown panels, MultiSelect panels,
// Calendars, and Popups always appear above modals and dialogs.
PrimeReact.autoZIndex = true;
PrimeReact.zIndex = {
  modal: 3000,
  overlay: 99999,
  menu: 99999,
  tooltip: 100000,
  toast: 110000,
};

// PrimeReact Core CSS
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import 'aos/dist/aos.css';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
