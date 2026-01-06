import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';

const ConnectionStatus = () => {
  const { isConnected, connectionError } = useWebSocket();

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="text-sm">Connected</span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center space-x-2 text-red-600" title={connectionError}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Connection Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-yellow-600">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">Connecting...</span>
    </div>
  );
};

export default ConnectionStatus;