import { useState, useEffect } from 'react';

export const useMetaMaskDetection = () => {
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [browserInfo, setBrowserInfo] = useState({});

  useEffect(() => {
    const checkMetaMask = () => {
      // Check if MetaMask is installed
      const hasMetaMask = typeof window !== 'undefined' && 
                         typeof window.ethereum !== 'undefined' && 
                         window.ethereum.isMetaMask;

      // Get browser information
      const userAgent = navigator.userAgent;
      const browser = {
        isChrome: /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor),
        isFirefox: /Firefox/.test(userAgent),
        isSafari: /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor),
        isEdge: /Edg/.test(userAgent),
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
        isIOS: /iPad|iPhone|iPod/.test(userAgent),
        isAndroid: /Android/.test(userAgent)
      };

      setIsMetaMaskInstalled(hasMetaMask);
      setBrowserInfo(browser);
      setIsChecking(false);
    };

    // Check immediately
    checkMetaMask();

    // Also check when window loads (in case MetaMask loads after our script)
    if (document.readyState === 'loading') {
      window.addEventListener('load', checkMetaMask);
      return () => window.removeEventListener('load', checkMetaMask);
    }
  }, []);

  const getInstallUrl = () => {
    if (browserInfo.isMobile) {
      if (browserInfo.isIOS) {
        return 'https://apps.apple.com/us/app/metamask/id1438144202';
      } else if (browserInfo.isAndroid) {
        return 'https://play.google.com/store/apps/details?id=io.metamask';
      }
    }
    
    // Desktop browsers
    if (browserInfo.isChrome) {
      return 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn';
    } else if (browserInfo.isFirefox) {
      return 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/';
    } else if (browserInfo.isEdge) {
      return 'https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm';
    }
    
    // Default to Chrome Web Store
    return 'https://metamask.io/download/';
  };

  const getBrowserName = () => {
    if (browserInfo.isChrome) return 'Chrome';
    if (browserInfo.isFirefox) return 'Firefox';
    if (browserInfo.isSafari) return 'Safari';
    if (browserInfo.isEdge) return 'Edge';
    if (browserInfo.isMobile) {
      if (browserInfo.isIOS) return 'iOS';
      if (browserInfo.isAndroid) return 'Android';
    }
    return 'Browser';
  };

  return {
    isMetaMaskInstalled,
    isChecking,
    browserInfo,
    getInstallUrl,
    getBrowserName
  };
};