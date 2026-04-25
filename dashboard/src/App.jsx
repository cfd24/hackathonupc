import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BenchmarkPage from './pages/BenchmarkPage';
import VisualizerPage from './pages/VisualizerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BenchmarkPage />} />
        <Route path="/visualizer" element={<VisualizerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
