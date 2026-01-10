import { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';

const QRCodeScanner = ({ onScanSuccess, onScanError, isActive = false }) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [error, setError] = useState(null);
  const [scannedData, setScannedData] = useState(null);

  // Initialize scanner
  useEffect(() => {
    if (isActive && videoRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, [isActive]);

  const initializeScanner = async () => {
    try {
      // Check if camera is available
      const cameraAvailable = await QrScanner.hasCamera();
      setHasCamera(cameraAvailable);

      if (!cameraAvailable) {
        setError('No camera found. Please ensure your device has a camera and permissions are granted.');
        return;
      }

      // Create scanner instance
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result),
        {
          onDecodeError: (error) => {
            // Ignore decode errors (normal when no QR code is visible)
            console.log('Decode error:', error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment' // Use back camera on mobile
        }
      );

      // Start scanning
      await scannerRef.current.start();
      setIsScanning(true);
      setError(null);

    } catch (err) {
      console.error('Scanner initialization error:', err);
      setError('Failed to initialize camera. Please check permissions and try again.');
      setIsScanning(false);
    }
  };

  const handleScanResult = (result) => {
    try {
      // Parse QR code data
      const qrData = JSON.parse(result.data);
      
      // Validate QR code format
      if (qrData.type === 'RELIEF_PAYMENT' && qrData.vendorId && qrData.paymentCode) {
        setScannedData(qrData);
        
        // Stop scanning temporarily
        if (scannerRef.current) {
          scannerRef.current.pause();
        }
        
        // Notify parent component
        if (onScanSuccess) {
          onScanSuccess(qrData);
        }
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (error) {
      console.error('QR code parsing error:', error);
      if (onScanError) {
        onScanError('Invalid QR code. Please scan a valid vendor payment code.');
      }
    }
  };

  const startScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.start();
      setIsScanning(true);
      setScannedData(null);
      setError(null);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.pause();
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setError(null);
    startScanning();
  };

  if (!isActive) {
    return (
      <div className="w-full max-w-sm mx-auto bg-gray-100 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">📱</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Scanner Ready</h3>
        <p className="text-gray-600 text-sm">
          Activate scanner to scan vendor payment codes
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">Scanner Error</h3>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button
          onClick={initializeScanner}
          className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (scannedData) {
    return (
      <div className="w-full max-w-sm mx-auto bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">QR Code Scanned!</h3>
        <div className="text-sm text-green-700 mb-4">
          <div className="font-medium">Vendor ID: {scannedData.vendorId}</div>
          <div>Payment Code: {scannedData.paymentCode}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetScanner}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors text-sm"
          >
            Scan Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Scanner Interface */}
      <div className="relative bg-black rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          playsInline
          muted
        />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-white rounded-2xl relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
            
            {/* Scanning Animation */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-1 bg-blue-500 animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 left-4 right-4">
          <div className={`text-center text-white text-sm font-medium px-3 py-2 rounded-full ${
            isScanning ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isScanning ? '📷 Scanning...' : '⏸️ Paused'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-2">
        {isScanning ? (
          <button
            onClick={stopScanning}
            className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
          >
            ⏸️ Pause Scanning
          </button>
        ) : (
          <button
            onClick={startScanning}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            ▶️ Start Scanning
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
        <div className="text-center text-blue-700 text-sm">
          <div className="font-medium mb-1">📱 How to Scan</div>
          <div className="text-xs">
            Point your camera at the vendor's QR code and hold steady
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;