import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

const QRCodeGenerator = ({ vendorId, paymentCode, onCodeGenerated }) => {
  const [qrData, setQrData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate QR code data
  useEffect(() => {
    if (vendorId && paymentCode) {
      generateQRData();
    }
  }, [vendorId, paymentCode]);

  const generateQRData = () => {
    setIsGenerating(true);
    
    // Create payment data object
    const paymentData = {
      type: 'RELIEF_PAYMENT',
      vendorId: vendorId,
      paymentCode: paymentCode,
      timestamp: Date.now(),
      version: '1.0'
    };

    // Convert to JSON string for QR code
    const qrDataString = JSON.stringify(paymentData);
    setQrData(qrDataString);
    
    // Notify parent component
    if (onCodeGenerated) {
      onCodeGenerated(paymentData);
    }
    
    setIsGenerating(false);
  };

  const regenerateCode = () => {
    generateQRData();
  };

  if (!vendorId || !paymentCode) {
    return (
      <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center mx-auto">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm text-gray-500">Missing vendor data</div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Generating QR Code...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* QR Code Display */}
      <div className="bg-white p-4 rounded-2xl shadow-lg inline-block mb-4">
        <QRCode
          value={qrData}
          size={192}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 192 192`}
        />
      </div>

      {/* QR Code Info */}
      <div className="text-sm text-gray-600 mb-3">
        <div className="font-medium">Vendor ID: {vendorId}</div>
        <div>Payment Code: {paymentCode}</div>
        <div className="text-xs text-gray-500 mt-1">
          Scan with beneficiary app to make payment
        </div>
      </div>

      {/* Regenerate Button */}
      <button
        onClick={regenerateCode}
        className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center justify-center mx-auto"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Generate New Code
      </button>

      {/* Security Notice */}
      <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
        <div className="flex items-center justify-center text-green-700 text-sm">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secure Payment Code
        </div>
        <div className="text-xs text-green-600 mt-1">
          This QR code is unique and expires after use
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;