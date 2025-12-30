import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600">
              🌍 Disaster Relief
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/transparency" className="text-gray-700 hover:text-blue-600">
              Transparency
            </Link>
            <Link to="/how-it-works" className="text-gray-700 hover:text-blue-600">
              How It Works
            </Link>
            <button className="btn-primary">
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;