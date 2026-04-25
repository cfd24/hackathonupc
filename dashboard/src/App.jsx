import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BenchmarkPage from './pages/BenchmarkPage';
import VisualizerPage from './pages/VisualizerPage';
import PalletizerPage from './pages/PalletizerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BenchmarkPage />} />
        <Route path="/visualizer" element={<VisualizerPage />} />
        <Route path="/palletizer" element={<PalletizerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
