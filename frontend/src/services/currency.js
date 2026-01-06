// Currency conversion service with real-time exchange rates
class CurrencyService {
  constructor() {
    this.exchangeRate = 83.25; // Default INR to USD rate
    this.lastUpdated = null;
    this.updateInterval = null;
    this.isUpdating = false;
  }

  // Initialize the service and start periodic updates
  async initialize() {
    await this.updateExchangeRate();
    this.startPeriodicUpdates();
  }

  // Fetch latest exchange rate from API
  async updateExchangeRate() {
    if (this.isUpdating) return;
    
    try {
      this.isUpdating = true;
      
      // Using exchangerate-api.com (free tier: 1500 requests/month)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (response.ok) {
        const data = await response.json();
        if (data.rates && data.rates.INR) {
          this.exchangeRate = data.rates.INR;
          this.lastUpdated = new Date();
          console.log(`Exchange rate updated: 1 USD = ₹${this.exchangeRate}`);
          
          // Store in localStorage for offline fallback
          localStorage.setItem('exchangeRate', JSON.stringify({
            rate: this.exchangeRate,
            timestamp: this.lastUpdated.getTime()
          }));
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.warn('Failed to update exchange rate, using cached/default rate:', error);
      
      // Try to use cached rate
      const cached = localStorage.getItem('exchangeRate');
      if (cached) {
        try {
          const { rate, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          
          // Use cached rate if less than 24 hours old
          if (cacheAge < 24 * 60 * 60 * 1000) {
            this.exchangeRate = rate;
            this.lastUpdated = new Date(timestamp);
            console.log(`Using cached exchange rate: 1 USD = ₹${this.exchangeRate}`);
          }
        } catch (parseError) {
          console.warn('Failed to parse cached exchange rate');
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }

  // Start periodic updates every 30 minutes
  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Update every 30 minutes
    this.updateInterval = setInterval(() => {
      this.updateExchangeRate();
    }, 30 * 60 * 1000);
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Convert USD to INR
  usdToInr(usdAmount) {
    return usdAmount * this.exchangeRate;
  }

  // Convert INR to USD
  inrToUsd(inrAmount) {
    return inrAmount / this.exchangeRate;
  }

  // Format currency in INR
  formatINR(amount, options = {}) {
    const {
      showDecimals = true,
      showSymbol = true,
      compact = false
    } = options;

    const numAmount = parseFloat(amount) || 0;
    
    if (compact && numAmount >= 100000) {
      // Indian number system: Lakh, Crore
      if (numAmount >= 10000000) { // 1 Crore
        const crores = numAmount / 10000000;
        return `${showSymbol ? '₹' : ''}${crores.toFixed(1)}Cr`;
      } else if (numAmount >= 100000) { // 1 Lakh
        const lakhs = numAmount / 100000;
        return `${showSymbol ? '₹' : ''}${lakhs.toFixed(1)}L`;
      }
    }

    return new Intl.NumberFormat('en-IN', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: 'INR',
      minimumFractionDigits: showDecimals ? 0 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(numAmount);
  }

  // Format currency in USD (for comparison)
  formatUSD(amount, options = {}) {
    const {
      showDecimals = true,
      showSymbol = true
    } = options;

    const numAmount = parseFloat(amount) || 0;

    return new Intl.NumberFormat('en-US', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: 'USD',
      minimumFractionDigits: showDecimals ? 0 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    }).format(numAmount);
  }

  // Convert Wei to INR (for blockchain amounts)
  weiToINR(weiAmount, options = {}) {
    const ethAmount = parseFloat(weiAmount) / Math.pow(10, 18);
    const usdAmount = ethAmount; // Assuming 1 ETH = 1 USD for simplicity in demo
    const inrAmount = this.usdToInr(usdAmount);
    return this.formatINR(inrAmount, options);
  }

  // Convert Wei to USD (for comparison)
  weiToUSD(weiAmount, options = {}) {
    const ethAmount = parseFloat(weiAmount) / Math.pow(10, 18);
    const usdAmount = ethAmount; // Assuming 1 ETH = 1 USD for simplicity in demo
    return this.formatUSD(usdAmount, options);
  }

  // Get current exchange rate info
  getExchangeRateInfo() {
    return {
      rate: this.exchangeRate,
      lastUpdated: this.lastUpdated,
      formatted: `1 USD = ₹${this.exchangeRate.toFixed(2)}`
    };
  }

  // Format dual currency display
  formatDualCurrency(amount, options = {}) {
    const {
      primaryCurrency = 'INR',
      showSecondary = true,
      isWei = false
    } = options;

    let inrAmount, usdAmount;

    if (isWei) {
      const ethAmount = parseFloat(amount) / Math.pow(10, 18);
      usdAmount = ethAmount; // Assuming 1 ETH = 1 USD for demo
      inrAmount = this.usdToInr(usdAmount);
    } else {
      // Assume amount is in USD
      usdAmount = parseFloat(amount);
      inrAmount = this.usdToInr(usdAmount);
    }

    const inrFormatted = this.formatINR(inrAmount);
    const usdFormatted = this.formatUSD(usdAmount);

    if (!showSecondary) {
      return primaryCurrency === 'INR' ? inrFormatted : usdFormatted;
    }

    if (primaryCurrency === 'INR') {
      return `${inrFormatted} (${usdFormatted})`;
    } else {
      return `${usdFormatted} (${inrFormatted})`;
    }
  }
}

// Create singleton instance
const currencyService = new CurrencyService();

export default currencyService;