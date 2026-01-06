import { useState, useEffect } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ImpactVisualization = ({ refreshTrigger }) => {
  const { account, isConnected } = useWallet();
  const { isAuthenticated } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [impactData, setImpactData] = useState(null);
  const [donorStats, setDonorStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImpactData = async () => {
      if (!isConnected || !account) {
        setLoading(false);
        return;
      }

      // If not authenticated, show empty state instead of making API calls
      if (!isAuthenticated) {
        setLoading(false);
        setImpactData(null);
        setDonorStats(null);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load impact data and donor stats in parallel
        const [impactResponse, statsResponse] = await Promise.all([
          apiService.getDonorImpact().catch(() => ({ success: false, data: null })),
          apiService.getDonorStats().catch(() => ({ success: false, data: null }))
        ]);

        if (impactResponse.success) {
          setImpactData(impactResponse.data);
        }
        
        if (statsResponse.success) {
          setDonorStats(statsResponse.data);
        }

      } catch (err) {
        console.error('Error loading impact data:', err);
        setError('Failed to load impact data');
      } finally {
        setLoading(false);
      }
    };

    loadImpactData();
  }, [isConnected, account, isAuthenticated, refreshTrigger]);

  if (!isConnected) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🔗</div>
          <p>Connect your wallet to see your impact</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
        <div className="text-center py-8 text-yellow-600">
          <div className="text-4xl mb-4">🎯</div>
          <p className="mb-4">Authentication required to view your impact</p>
          <p className="text-sm text-gray-600 mb-4">
            Click the "Auth" button in the header to authenticate and track your donation impact
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
            <p className="font-medium mb-2">Your impact tracking includes:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Total donations and beneficiaries helped</li>
              <li>Impact breakdown by category</li>
              <li>Your donor ranking and statistics</li>
              <li>Transparency score and verification</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
        <div className="text-center py-8 text-red-500">
          <div className="text-4xl mb-4">⚠️</div>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const totalDonated = parseFloat(impactData?.totalDonated || 0);
  const beneficiariesHelped = impactData?.beneficiariesHelped || 0;
  const categoriesSupported = impactData?.categoriesSupported || [];
  const impactMetrics = impactData?.impactMetrics || {};
  
  const donationCount = donorStats?.donationCount || 0;
  const averageDonation = parseFloat(donorStats?.averageDonation || 0);
  const rank = donorStats?.rank;
  const percentile = donorStats?.percentile || 0;

  // Calculate category distribution for visualization
  const categoryData = categoriesSupported.map(cat => ({
    name: cat.category,
    amount: parseFloat(cat.donorImpact || 0),
    transactions: cat.transactionCount || 0
  }));

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Your Impact</h2>
      
      {totalDonated === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🎯</div>
          <p>Make your first donation to see your impact!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Impact Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalDonated, { isWei: false })}
              </div>
              <div className="text-sm text-gray-600">Total Donated</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(beneficiariesHelped)}
              </div>
              <div className="text-sm text-gray-600">People Helped</div>
            </div>
          </div>

          {/* Donor Statistics */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Your Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Donations:</span>
                <span className="font-semibold">{formatNumber(donationCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Donation:</span>
                <span className="font-semibold">{formatCurrency(averageDonation, { isWei: false })}</span>
              </div>
              {rank && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Donor Rank:</span>
                    <span className="font-semibold">#{formatNumber(rank)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Top Percentile:</span>
                    <span className="font-semibold text-green-600">{percentile}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Impact by Category */}
          {categoryData.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Impact by Category</h3>
              <div className="space-y-3">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-green-400"></div>
                      <span className="text-sm font-medium capitalize">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(category.amount, { isWei: false })}</div>
                      <div className="text-xs text-gray-500">{category.transactions} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specific Impact Metrics */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Specific Impact</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">🍽️ Food Provided:</span>
                <span className="font-semibold">{formatCurrency(impactMetrics.foodProvided || 0, { isWei: false })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">🏠 Shelter Support:</span>
                <span className="font-semibold">{formatCurrency(impactMetrics.shelterSupported || 0, { isWei: false })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">💊 Medical Aid:</span>
                <span className="font-semibold">{formatCurrency(impactMetrics.medicalAid || 0, { isWei: false })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">📚 Education:</span>
                <span className="font-semibold">{formatCurrency(impactMetrics.educationSupport || 0, { isWei: false })}</span>
              </div>
            </div>
          </div>

          {/* Transparency Score */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Transparency Score:</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full">
                  <div className="w-full h-full bg-green-500 rounded-full"></div>
                </div>
                <span className="font-semibold text-green-600">100%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              All transactions are verified on the blockchain
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactVisualization;