import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import VariantAnalysis from './pages/VariantAnalysis';
import TransmissionModel from './pages/TransmissionModel';
import VaccineOptimization from './pages/VaccineOptimization';
import FileUpload from './pages/FileUpload';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/variant-analysis" element={<VariantAnalysis />} />
            <Route path="/transmission-model" element={<TransmissionModel />} />
            <Route path="/vaccine-optimization" element={<VaccineOptimization />} />
            <Route path="/upload" element={<FileUpload />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App; 