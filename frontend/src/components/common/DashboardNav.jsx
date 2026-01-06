import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DashboardNav = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const currentRole = user?.roles?.[0] || 'donor';

  const dashboardLinks = {
    donor: { path: '/donor', label: 'Donor Dashboard', icon: '💝' },
    beneficiary: { path: '/beneficiary', label: 'Beneficiary Dashboard', icon: '🏠' },
    vendor: { path: '/vendor', label: 'Vendor Dashboard', icon: '🏪' },
    admin: { path: '/admin', label: 'Admin Panel', icon: '⚙️' },
    verifier: { path: '/verifier', label: 'Verifier Panel', icon: '✅' }
  };

  const currentDashboard = dashboardLinks[currentRole];

  if (!currentDashboard) return null;

  return (
    <div className="bg-blue-50 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <Link
            to={currentDashboard.path}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === currentDashboard.path
                ? 'bg-blue-100 text-blue-800'
                : 'text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span>{currentDashboard.icon}</span>
            <span className="font-medium">{currentDashboard.label}</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/transparency"
              className="text-blue-700 hover:text-blue-800 text-sm"
            >
              View Transparency Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardNav;