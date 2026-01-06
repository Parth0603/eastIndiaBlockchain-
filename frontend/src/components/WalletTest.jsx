import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletTest = () => {
  const {
    isConnected,
    account,
    balance,
    connectWallet,
    disconnectWallet,
    getNetworkInfo,
    switchToSepolia,
    isLoading,
    error
  } = useWallet();

  const [networkInfo, setNetworkInfo] = useState(null);

  const handleGetNetworkInfo = async () => {
    const info = await getNetworkInfo();
    setNetworkInfo(info);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">MetaMask SDK Test</h2>
      
      {/* Connection Status */}
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Connection Status</h3>
        <p>Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
        {account && <p>Account: {account}</p>}
        {balance && <p>Balance: {parseFloat(balance).toFixed(4)} ETH</p>}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Network Info */}
      {networkInfo && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Network Info</h3>
          <p>Chain ID: {networkInfo.chainId}</p>
          <p>Is Localhost: {networkInfo.isLocalhost ? 'Yes' : 'No'}</p>
          <p>Is Sepolia: {networkInfo.isSepolia ? 'Yes' : 'No'}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isConnected ? (
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        ) : (
          <>
            <button
              onClick={disconnectWallet}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Disconnect
            </button>
            
            <button
              onClick={handleGetNetworkInfo}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Get Network Info
            </button>
            
            <button
              onClick={switchToSepolia}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
            >
              Switch to Sepolia
            </button>
          </>
        )}
      </div>

      {/* SDK Info */}
      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h3 className="font-semibold mb-2">SDK Configuration</h3>
        <p>Infura API Key: be40a16531a4446dad8d3ce44fcc94a7</p>
        <p>Sepolia RPC: https://sepolia.infura.io/v3/be40a16531a4446dad8d3ce44fcc94a7</p>
      </div>
    </div>
  );
};

export default WalletTest;