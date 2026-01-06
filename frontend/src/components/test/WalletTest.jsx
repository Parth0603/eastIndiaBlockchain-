import { useWallet } from '../../hooks/useWallet';

const WalletTest = () => {
  const { isConnected, account, connectWallet, disconnectWallet, isLoading, error } = useWallet();

  const handleConnect = async () => {
    try {
      console.log('Testing wallet connection...');
      await connectWallet();
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-8">
      <h3 className="text-lg font-bold mb-4">Wallet Connection Test</h3>
      
      <div className="space-y-4">
        <div>
          <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        {account && (
          <div>
            <strong>Account:</strong> {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        )}
        
        {error && (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
          
          {isConnected && (
            <button
              onClick={disconnectWallet}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletTest;