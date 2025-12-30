import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transparent Disaster Relief
            <span className="text-blue-600"> on Blockchain</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Ensure your donations reach those in need with complete transparency, 
            smart contract automation, and real-time tracking powered by blockchain technology.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/donor" className="btn-primary text-lg px-8 py-3">
              Start Donating
            </Link>
            <Link to="/transparency" className="btn-secondary text-lg px-8 py-3">
              View Transparency Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Problem with Traditional Relief Systems
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">❌</div>
              <h3 className="font-semibold text-gray-900 mb-2">Lack of Transparency</h3>
              <p className="text-gray-600">Donors can't track where their money goes</p>
            </div>
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">🚫</div>
              <h3 className="font-semibold text-gray-900 mb-2">Corruption Risk</h3>
              <p className="text-gray-600">Funds can be misappropriated by intermediaries</p>
            </div>
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⏰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Slow Distribution</h3>
              <p className="text-gray-600">Bureaucratic processes delay urgent aid</p>
            </div>
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">No Accountability</h3>
              <p className="text-gray-600">Limited tracking of impact and effectiveness</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solution */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Blockchain Solution
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-green-500 text-4xl mb-4">✅</div>
              <h3 className="font-semibold text-gray-900 mb-2">Complete Transparency</h3>
              <p className="text-gray-600">All transactions publicly auditable on blockchain</p>
            </div>
            <div className="card text-center">
              <div className="text-green-500 text-4xl mb-4">🤖</div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Contracts</h3>
              <p className="text-gray-600">Automated distribution eliminates human error</p>
            </div>
            <div className="card text-center">
              <div className="text-green-500 text-4xl mb-4">💰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Stablecoin Payments</h3>
              <p className="text-gray-600">Fast, borderless, and stable value transfers</p>
            </div>
            <div className="card text-center">
              <div className="text-green-500 text-4xl mb-4">🔐</div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Access</h3>
              <p className="text-gray-600">Role-based permissions for all stakeholders</p>
            </div>
            <div className="card text-center">
              <div className="text-green-500 text-4xl mb-4">🛡️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Spending Controls</h3>
              <p className="text-gray-600">Funds restricted to essential categories only</p>
            </div>
            <div className="card text-center">
              <div className="text-green-500 text-4xl mb-4">📈</div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">Live updates on distribution and impact</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Make a Transparent Impact?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join our platform and help disaster victims with accountability you can trust
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/donor" className="bg-white text-blue-600 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg transition-colors">
              Become a Donor
            </Link>
            <Link to="/beneficiary" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-medium py-3 px-8 rounded-lg transition-colors">
              Apply for Relief
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;