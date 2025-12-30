import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import DonorDashboard from './pages/DonorDashboard';
import BeneficiaryDashboard from './pages/BeneficiaryDashboard';
import AdminPanel from './pages/AdminPanel';
import TransparencyDashboard from './pages/TransparencyDashboard';
import About from './pages/About';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';

// Hooks
import { useWallet } from './hooks/useWallet';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isConnected, account } = useWallet();
  const { user, isAuthenticated } = useAuth();

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/donor" element={<DonorDashboard />} />
              <Route path="/beneficiary" element={<BeneficiaryDashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/transparency" element={<TransparencyDashboard />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="top-right" />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;