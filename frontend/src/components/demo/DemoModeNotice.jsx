const DemoModeNotice = ({ onInstallMetaMask }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">👀</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Demo Mode - Limited Functionality
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>You're viewing ReliefChain in demo mode. To unlock full functionality:</p>
            <ul className="mt-2 space-y-1">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                <span>Install MetaMask wallet</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                <span>Connect your wallet</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                <span>Make real donations on blockchain</span>
              </li>
            </ul>
          </div>
          <div className="mt-4">
            <button
              onClick={onInstallMetaMask}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-colors"
            >
              🦊 Install MetaMask to Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModeNotice;