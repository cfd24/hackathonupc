import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VisualizerPage from './pages/VisualizerPage';
import PalletizerPage from './pages/PalletizerPage';
import RawDataPage from './pages/RawDataPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VisualizerPage />} />
        <Route path="/raw-data" element={<RawDataPage />} />
      </Routes>
    </Router>
  );
}

export default App;
