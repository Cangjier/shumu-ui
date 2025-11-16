import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { InjectStyle } from './natived';
const VITE_PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL;
console.log(`build time:${import.meta.env.VITE_APP_BUILD_TIME}`);
InjectStyle(`
body{
  margin:0;
}
.ant-btn:not(:disabled):focus-visible {
  outline: none;
}
`);
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={VITE_PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<Home style={{ width: '100vw', height: '100vh' }}></Home>} />
        {/* <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chapters" element={<Chapters />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>

);