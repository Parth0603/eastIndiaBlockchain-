import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import Donate from './pages/Donate';
import DonationDetails from './pages/DonationDetails';
import ApplyRelief from './pages/ApplyRelief';
import SignUp from './pages/SignUp';
import DonorDashboard from './pages/DonorDashboard';
import BeneficiaryDashboard from './pages/BeneficiaryDashboard';
import VendorDashboard from './pages/VendorDashboard';
import VerifierPanel from './pages/VerifierPanel';
import AdminPanel from './pages/AdminPanel';
import TransparencyDashboard from './pages/TransparencyDashboard';
import PublicTransparency from './pages/PublicTransparency';
import TrackFunds from './pages/TrackFunds';
import About from './pages/About';
import CreateCampaign from './pages/CreateCampaign';

// Signup Components
import BeneficiarySignup from './components/signup/BeneficiarySignup';
import VendorSignup from './components/signup/VendorSignup';
import DonorSignup from './components/signup/DonorSignup';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';

// Contexts
import { CurrencyProvider } from './contexts/CurrencyContext';

// Hooks
import { useWallet } from './hooks/useWallet';
import { useAuth } from './hooks/useAuth';
import { usePageTitle } from './hooks/usePageTitle';

function AppContent() {
  const { isConnected, account } = useWallet();
  const { user, isAuthenticated } = useAuth();
  
  // Set dynamic page title based on authentication and role
  usePageTitle();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/donate/:eventId" element={<DonationDetails />} />
          <Route path="/apply-relief" element={<ApplyRelief />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/beneficiary" element={<BeneficiarySignup />} />
          <Route path="/signup/vendor" element={<VendorSignup />} />
          <Route path="/signup/donor" element={<DonorSignup />} />
          <Route path="/donor" element={<DonorDashboard />} />
          <Route path="/beneficiary" element={<BeneficiaryDashboard />} />
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/vendor-dashboard" element={<VendorDashboard />} />
          <Route path="/verifier" element={<VerifierPanel />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/create-campaign" element={<CreateCampaign />} />
          <Route path="/transparency" element={<TransparencyDashboard />} />
          <Route path="/public-transparency" element={<PublicTransparency />} />
          <Route path="/track-funds" element={<TrackFunds />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <Router>
          <AppContent />
        </Router>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}

export default App;