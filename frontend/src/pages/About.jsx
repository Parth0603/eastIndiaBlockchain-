import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            About Our Mission
          </h1>
          <p className="text-xl text-gray-600">
            Revolutionizing disaster relief through blockchain transparency
          </p>
        </div>

        <div className="space-y-12">
          {/* Mission */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              We believe that disaster relief should be transparent, efficient, and accountable. 
              Our blockchain-based platform ensures that every donation reaches those who need it most, 
              with complete visibility into how funds are distributed and used. By leveraging smart 
              contracts and stablecoins, we eliminate corruption, reduce bureaucracy, and provide 
              real-time tracking of relief efforts.
            </p>
          </div>

          {/* Problem We Solve */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The Problem We Solve</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="text-red-500 text-xl mr-3 mt-1">❌</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Lack of Transparency</h3>
                  <p className="text-gray-600">Traditional relief systems often lack visibility into fund distribution</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-red-500 text-xl mr-3 mt-1">🚫</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Corruption and Mismanagement</h3>
                  <p className="text-gray-600">Funds can be diverted or misused by intermediaries</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-red-500 text-xl mr-3 mt-1">⏰</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Slow Distribution</h3>
                  <p className="text-gray-600">Bureaucratic processes delay urgent aid to disaster victims</p>
                </div>
              </div>
            </div>
          </div>

          {/* Our Solution */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Solution</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="text-green-500 text-xl mr-3 mt-1">✅</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Blockchain Transparency</h3>
                  <p className="text-gray-600">Every transaction is recorded on the blockchain for public verification</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-green-500 text-xl mr-3 mt-1">🤖</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Contract Automation</h3>
                  <p className="text-gray-600">Automated distribution eliminates human error and corruption</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="text-green-500 text-xl mr-3 mt-1">🔒</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Controlled Spending</h3>
                  <p className="text-gray-600">Funds can only be spent on essential items at approved vendors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Impact */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Impact</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-gray-600">Transparency Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">0%</div>
                <div className="text-gray-600">Corruption Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
                <div className="text-gray-600">Real-time Tracking</div>
              </div>
            </div>
          </div>

          {/* Technology */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Technology Stack</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Blockchain</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• Ethereum smart contracts</li>
                  <li>• Solidity programming</li>
                  <li>• OpenZeppelin security</li>
                  <li>• Hardhat development</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Frontend</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• React with Vite</li>
                  <li>• Tailwind CSS</li>
                  <li>• MetaMask integration</li>
                  <li>• Real-time updates</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Team</h2>
            <p className="text-gray-600 leading-relaxed">
              We are a team of blockchain developers, disaster relief experts, and social impact 
              advocates committed to making disaster relief more effective and transparent. Our 
              diverse backgrounds in technology, humanitarian work, and public policy drive our 
              mission to create positive change in the world.
            </p>
          </div>

          {/* Call to Action */}
          <div className="bg-blue-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Join Our Mission</h2>
            <p className="mb-6">
              Help us build a more transparent and effective disaster relief system
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 hover:bg-gray-100 font-medium py-2 px-6 rounded-lg">
                Become a Donor
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-medium py-2 px-6 rounded-lg">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;