import React, { useState } from 'react';

const WalletInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-600 hover:text-blue-800 text-sm"
        title="Wallet Connection Info"
      >
        ℹ️ Wallet Info
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-4 z-50">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-medium text-gray-900">Wallet Connection Info</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">🔗 Connect Wallet:</strong>
              <p>Connects to MetaMask and requests account access.</p>
            </div>
            
            <div>
              <strong className="text-gray-900">✅ Authenticate:</strong>
              <p>Signs a message to prove wallet ownership. This happens automatically after connecting.</p>
            </div>
            
            <div>
              <strong className="text-gray-900">🔄 Disconnect:</strong>
              <p>Clears your authentication from this app. MetaMask will still remember the connection and may ask for permission again when you reconnect.</p>
            </div>
            
            <div>
              <strong className="text-gray-900">🎭 Role Switching:</strong>
              <p>Demo feature that lets you test different user roles (donor, beneficiary, vendor, admin).</p>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                💡 <strong>Tip:</strong> If MetaMask keeps asking for connection, it's normal behavior. Click "Connect" to proceed or "Cancel" to stay disconnected.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletInfo;