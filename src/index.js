// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// 导入 React Router 路由（同级路径，无需子目录）
import AppRouter from './router';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <AppRouter /> {/* 无需包裹其他组件，直接挂载路由 */}
    </React.StrictMode>
);

// 性能监控（CRA 默认功能，保留）
reportWebVitals();