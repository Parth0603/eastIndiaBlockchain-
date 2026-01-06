import { useState, useEffect, useCallback } from 'react';
import { useContract } from './useContract';

export const useContractEvents = () => {
  const { contracts, subscribeToEvents } = useContract();
  const [events, setEvents] = useState([]);
  const [isListening, setIsListening] = useState(false);

  // Add new event to the list
  const addEvent = useCallback((event) => {
    setEvents(prev => [{
      ...event,
      timestamp: new Date(),
      id: `${event.transactionHash}-${event.logIndex}`,
    }, ...prev].slice(0, 100)); // Keep only last 100 events
  }, []);

  // Subscribe to donation events
  const subscribeToDonations = useCallback(() => {
    if (!contracts.reliefDistribution) return null;

    return subscribeToEvents('reliefDistribution', 'DonationReceived', (event) => {
      addEvent({
        type: 'donation',
        donor: event.returnValues.donor,
        amount: event.returnValues.amount,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
      });
    });
  }, [contracts.reliefDistribution, subscribeToEvents, addEvent]);

  // Subscribe to beneficiary registration events
  const subscribeToBeneficiaryRegistrations = useCallback(() => {
    if (!contracts.reliefDistribution) return null;

    return subscribeToEvents('reliefDistribution', 'BeneficiaryRegistered', (event) => {
      addEvent({
        type: 'beneficiary_registered',
        beneficiary: event.returnValues.beneficiary,
        name: event.returnValues.name,
        location: event.returnValues.location,
        requestedAmount: event.returnValues.requestedAmount,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
      });
    });
  }, [contracts.reliefDistribution, subscribeToEvents, addEvent]);

  // Subscribe to token minting events
  const subscribeToTokenMinting = useCallback(() => {
    if (!contracts.reliefToken) return null;

    return subscribeToEvents('reliefToken', 'TokensMinted', (event) => {
      addEvent({
        type: 'tokens_minted',
        to: event.returnValues.to,
        amount: event.returnValues.amount,
        purpose: event.returnValues.purpose,
        minter: event.returnValues.minter,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
      });
    });
  }, [contracts.reliefToken, subscribeToEvents, addEvent]);

  // Subscribe to all events
  const startListening = useCallback(() => {
    if (isListening) return;

    const subscriptions = [
      subscribeToDonations(),
      subscribeToBeneficiaryRegistrations(),
      subscribeToTokenMinting(),
    ].filter(Boolean);

    setIsListening(true);

    // Return cleanup function
    return () => {
      subscriptions.forEach(subscription => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      setIsListening(false);
    };
  }, [isListening, subscribeToDonations, subscribeToBeneficiaryRegistrations, subscribeToTokenMinting]);

  // Auto-start listening when contracts are available
  useEffect(() => {
    if (contracts.reliefDistribution && contracts.reliefToken && !isListening) {
      const cleanup = startListening();
      return cleanup;
    }
  }, [contracts.reliefDistribution, contracts.reliefToken, isListening, startListening]);

  // Filter events by type
  const getEventsByType = useCallback((type) => {
    return events.filter(event => event.type === type);
  }, [events]);

  // Get recent events (last N events)
  const getRecentEvents = useCallback((count = 10) => {
    return events.slice(0, count);
  }, [events]);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isListening,
    startListening,
    getEventsByType,
    getRecentEvents,
    clearEvents,
    
    // Event counts
    totalEvents: events.length,
    donationEvents: getEventsByType('donation').length,
    beneficiaryEvents: getEventsByType('beneficiary_registered').length,
    mintingEvents: getEventsByType('tokens_minted').length,
  };
};