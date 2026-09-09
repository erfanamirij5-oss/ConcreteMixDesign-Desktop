import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import { RootApp } from './RootApp';
import './styles.css';
import './forms.css';
import './revision-control.css';
import './report-center-root.css';
import './premium-ui.css';
import './accessibility.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
