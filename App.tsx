import React from 'react';
import { AppProvider } from './store.tsx';
import Layout from './components/Layout';
import './index.css';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
};

export default App;