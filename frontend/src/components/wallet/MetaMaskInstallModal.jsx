import { useState } from 'react';
import { useMetaMaskDetection } from '../../hooks/useMetaMaskDetection';

const MetaMaskInstallModal = ({ isOpen, onClose, onInstalled }) => {
  const { browserInfo, getInstallUrl, getBrowserName } = useMetaMaskDetection();
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleInstallClick = () => {
    window.open(getInstallUrl(), '_blank');
    setStep(2);
  };

  const handleCheckAgain = () => {
    // Reload the page to check if MetaMask is now installed
    window.location.reload();
  };

  const renderMobileInstructions = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📱</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Mobile Wallet Setup</h3>
        <p className="text-gray-600">
          Install MetaMask mobile app to use ReliefChain on your phone
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-3">📲 Step-by-Step Guide:</h4>
        <ol className="space-y-3 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
            <span>Download MetaMask from your app store</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
            <span>Create a new wallet or import existing one</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
            <span>Open MetaMask browser and visit ReliefChain</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
            <span>Connect your wallet to start donating</span>
          </li>
        </ol>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors font-semibold"
        >
          📱 Install MetaMask App
        </button>
      </div>
    </div>
  );

  const renderDesktopInstructions = () => (
    <div className="space-y-6">
      {step === 1 && (
        <>
          <div className="text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🦊</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">MetaMask Required</h3>
            <p className="text-gray-600">
              You need MetaMask wallet to connect to ReliefChain and make donations
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 mb-3">🚀 Quick Setup Guide:</h4>
            <ol className="space-y-3 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                <span>Install MetaMask extension for {getBrowserName()}</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                <span>Create a new wallet or import existing one</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                <span>Add Sepolia testnet for free transactions</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                <span>Return here and connect your wallet</span>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center">
              <span className="text-green-600 mr-3">✅</span>
              <div>
                <p className="text-green-800 font-medium">Free to Use</p>
                <p className="text-green-700 text-sm">ReliefChain uses Sepolia testnet - no real money needed!</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors font-semibold"
            >
              🦊 Install MetaMask
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⏳</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Installing MetaMask...</h3>
            <p className="text-gray-600">
              Follow the installation steps in the new tab, then come back here
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-6">
            <h4 className="font-semibold text-yellow-900 mb-3">📋 After Installation:</h4>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li className="flex items-center">
                <span className="text-yellow-600 mr-2">•</span>
                <span>Pin MetaMask extension to your browser toolbar</span>
              </li>
              <li className="flex items-center">
                <span className="text-yellow-600 mr-2">•</span>
                <span>Create or import your wallet</span>
              </li>
              <li className="flex items-center">
                <span className="text-yellow-600 mr-2">•</span>
                <span>Keep your seed phrase safe and private</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCheckAgain}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors font-semibold"
            >
              ✅ I've Installed MetaMask
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Close Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {browserInfo.isMobile ? renderMobileInstructions() : renderDesktopInstructions()}
        </div>
      </div>
    </div>
  );
};

export default MetaMaskInstallModal;