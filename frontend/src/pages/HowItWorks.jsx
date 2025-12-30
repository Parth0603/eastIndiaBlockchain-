import React from 'react';

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How Our System Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A transparent, blockchain-powered approach to disaster relief distribution
          </p>
        </div>

        {/* Process Steps */}
        <div className="space-y-16">
          {/* Step 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">1</span>
                <h2 className="text-2xl font-bold text-gray-900">Donors Contribute</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Donors connect their MetaMask wallet and contribute stablecoins to the relief fund. 
                All donations are recorded on the blockchain for complete transparency.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Connect MetaMask wallet</li>
                <li>• Choose donation amount in stablecoins</li>
                <li>• Transaction recorded on blockchain</li>
                <li>• Receive donation confirmation</li>
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="font-semibold mb-2">Secure Donations</h3>
                <p className="text-gray-600">Smart contracts ensure funds go directly to verified beneficiaries</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">2</span>
                <h2 className="text-2xl font-bold text-gray-900">Beneficiary Verification</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Disaster victims apply for relief funds by submitting verification documents. 
                Authorized verifiers review and approve legitimate applications.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Submit relief application</li>
                <li>• Provide verification documents</li>
                <li>• Verifier reviews application</li>
                <li>• Funds allocated upon approval</li>
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="font-semibold mb-2">Verified Recipients</h3>
                <p className="text-gray-600">Only verified disaster victims receive allocated relief funds</p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</span>
                <h2 className="text-2xl font-bold text-gray-900">Controlled Spending</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Beneficiaries can only spend allocated funds at approved vendors for essential items. 
                Smart contracts enforce spending restrictions automatically.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Spend only at approved vendors</li>
                <li>• Limited to essential categories</li>
                <li>• Smart contract validation</li>
                <li>• Real-time spending tracking</li>
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-4xl mb-4">🛒</div>
                <h3 className="font-semibold mb-2">Essential Purchases</h3>
                <p className="text-gray-600">Funds restricted to food, medicine, shelter, and other essentials</p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8">
            <div className="lg:w-1/2">
              <div className="flex items-center mb-4">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">4</span>
                <h2 className="text-2xl font-bold text-gray-900">Public Transparency</h2>
              </div>
              <p className="text-gray-600 mb-4">
                All transactions are publicly visible on the blockchain. Anyone can verify 
                how funds are being distributed and used for maximum accountability.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li>• Public transaction records</li>
                <li>• Real-time fund tracking</li>
                <li>• Blockchain verification</li>
                <li>• Impact measurement</li>
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="font-semibold mb-2">Full Transparency</h3>
                <p className="text-gray-600">Track every donation from source to final use</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="mt-20 bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Built on Trusted Technology
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">⛓️</div>
              <h3 className="font-semibold mb-2">Ethereum Blockchain</h3>
              <p className="text-gray-600">Immutable, transparent transaction records</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold mb-2">Smart Contracts</h3>
              <p className="text-gray-600">Automated, trustless fund distribution</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">💎</div>
              <h3 className="font-semibold mb-2">Stablecoins</h3>
              <p className="text-gray-600">Stable value, fast international transfers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;