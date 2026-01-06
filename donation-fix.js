// Enhanced donation handling function
const handleDonate = async () => {
  if (!isAuthenticated || !isConnected) {
    toast.error('Please connect your wallet and authenticate to donate.');
    return;
  }

  if (!donationAmount || parseFloat(donationAmount) <= 0) {
    toast.error('Please enter a valid donation amount');
    return;
  }

  setIsProcessing(true);
  try {
    const donationAmountNum = parseFloat(donationAmount);
    
    // Check if this is a user-created campaign (stored in localStorage)
    const userCreatedCampaigns = JSON.parse(localStorage.getItem('userCreatedCampaigns') || '[]');
    const isUserCreatedCampaign = userCreatedCampaigns.some(campaign => campaign.id === eventId);
    
    if (isUserCreatedCampaign) {
      // Handle user-created campaign donation (update localStorage)
      const updatedCampaigns = userCreatedCampaigns.map(campaign => {
        if (campaign.id === eventId) {
          return {
            ...campaign,
            raised: (campaign.raised || 0) + donationAmountNum
          };
        }
        return campaign;
      });
      
      localStorage.setItem('userCreatedCampaigns', JSON.stringify(updatedCampaigns));
      
      // Update the current event state
      setEvent(prev => ({
        ...prev,
        raised: (prev.raised || 0) + donationAmountNum
      }));
      
      toast.success(`Thank you for donating $${donationAmountNum.toFixed(2)} to ${event.title}!`);
      setDonationAmount('');
      setDonorMessage('');
      
    } else {
      // Try to process through backend API for backend campaigns
      try {
        const donationData = {
          amount: donationAmountNum,
          donor: account,
          campaignId: eventId,
          message: donorMessage
        };

        const response = await apiService.processDonation(donationData);
        
        if (response.success) {
          toast.success(`Thank you for donating $${donationAmountNum.toFixed(2)} to ${event.title}!`);
          setDonationAmount('');
          setDonorMessage('');
          
          // Refresh campaign data to show updated raised amount
          const updatedResponse = await apiService.getCampaign(eventId);
          if (updatedResponse.success) {
            setEvent(updatedResponse.data);
          }
        } else {
          throw new Error(response.message || 'Donation failed');
        }
      } catch (apiError) {
        console.log('Backend donation failed, using demo mode');
        
        // Fallback to demo mode - just show success message and update UI
        setEvent(prev => ({
          ...prev,
          raised: (prev.raised || 0) + donationAmountNum
        }));
        
        toast.success(`Thank you for donating $${donationAmountNum.toFixed(2)} to ${event.title}! (Demo Mode)`);
        setDonationAmount('');
        setDonorMessage('');
      }
    }
    
  } catch (error) {
    console.error('Donation error:', error);
    toast.error(error.message || 'Donation failed. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};