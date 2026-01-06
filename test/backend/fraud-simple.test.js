import { describe, it, expect } from 'vitest';
import fraudDetectionService from '../../backend/services/fraudDetection.js';

describe('Fraud Detection Service - Unit Tests', () => {
  describe('Risk Level Calculation', () => {
    it('should calculate low risk for no flags', () => {
      const flags = [];
      const warnings = [];
      const riskLevel = fraudDetectionService.calculateRiskLevel(flags, warnings);
      expect(riskLevel).toBe('low');
    });

    it('should calculate high risk for high severity flags', () => {
      const flags = [
        { severity: 'high', pattern: 'excessive_amount' }
      ];
      const warnings = [];
      const riskLevel = fraudDetectionService.calculateRiskLevel(flags, warnings);
      expect(riskLevel).toBe('high');
    });

    it('should calculate critical risk for multiple high severity flags', () => {
      const flags = [
        { severity: 'high', pattern: 'excessive_amount' },
        { severity: 'high', pattern: 'rapid_succession' }
      ];
      const warnings = [];
      const riskLevel = fraudDetectionService.calculateRiskLevel(flags, warnings);
      expect(riskLevel).toBe('critical');
    });

    it('should calculate medium risk for medium severity flags', () => {
      const flags = [
        { severity: 'medium', pattern: 'suspicious_timing' }
      ];
      const warnings = [];
      const riskLevel = fraudDetectionService.calculateRiskLevel(flags, warnings);
      expect(riskLevel).toBe('medium');
    });
  });

  describe('Recommendation Generation', () => {
    it('should recommend allow for low risk', () => {
      const flags = [];
      const warnings = [];
      const recommendation = fraudDetectionService.getRecommendation(flags, warnings);
      
      expect(recommendation.action).toBe('allow');
      expect(recommendation.requiresReview).toBe(false);
      expect(recommendation.autoFlag).toBe(false);
    });

    it('should recommend block for critical risk', () => {
      const flags = [
        { severity: 'high', pattern: 'excessive_amount' },
        { severity: 'high', pattern: 'rapid_succession' }
      ];
      const warnings = [];
      const recommendation = fraudDetectionService.getRecommendation(flags, warnings);
      
      expect(recommendation.action).toBe('block');
      expect(recommendation.requiresReview).toBe(true);
      expect(recommendation.autoFlag).toBe(true);
    });

    it('should recommend review for high risk', () => {
      const flags = [
        { severity: 'high', pattern: 'excessive_amount' }
      ];
      const warnings = [];
      const recommendation = fraudDetectionService.getRecommendation(flags, warnings);
      
      expect(recommendation.action).toBe('review');
      expect(recommendation.requiresReview).toBe(true);
      expect(recommendation.autoFlag).toBe(true);
    });

    it('should recommend monitor for medium risk', () => {
      const flags = [
        { severity: 'medium', pattern: 'suspicious_timing' }
      ];
      const warnings = [];
      const recommendation = fraudDetectionService.getRecommendation(flags, warnings);
      
      expect(recommendation.action).toBe('monitor');
      expect(recommendation.requiresReview).toBe(false);
      expect(recommendation.autoFlag).toBe(true);
    });
  });

  describe('Fraud Patterns', () => {
    it('should have correct fraud pattern constants', () => {
      expect(fraudDetectionService.fraudPatterns.DUPLICATE_TRANSACTION).toBe('duplicate_transaction');
      expect(fraudDetectionService.fraudPatterns.EXCESSIVE_AMOUNT).toBe('excessive_amount');
      expect(fraudDetectionService.fraudPatterns.RAPID_SUCCESSION).toBe('rapid_succession');
      expect(fraudDetectionService.fraudPatterns.UNUSUAL_VENDOR_PATTERN).toBe('unusual_vendor_pattern');
      expect(fraudDetectionService.fraudPatterns.EXCESSIVE_DAILY_SPENDING).toBe('excessive_daily_spending');
      expect(fraudDetectionService.fraudPatterns.SUSPICIOUS_TIMING).toBe('suspicious_timing');
      expect(fraudDetectionService.fraudPatterns.VENDOR_EXCESSIVE_DAILY).toBe('vendor_excessive_daily');
    });
  });

  describe('Thresholds', () => {
    it('should have reasonable fraud detection thresholds', () => {
      expect(fraudDetectionService.thresholds.maxTransactionAmount).toBe(1000);
      expect(fraudDetectionService.thresholds.maxDailyAmount).toBe(5000);
      expect(fraudDetectionService.thresholds.maxTransactionsPerHour).toBe(10);
      expect(fraudDetectionService.thresholds.duplicateTransactionWindow).toBe(300000); // 5 minutes
      expect(fraudDetectionService.thresholds.unusualVendorPattern).toBe(0.8);
      expect(fraudDetectionService.thresholds.rapidSuccessionThreshold).toBe(60000); // 1 minute
      expect(fraudDetectionService.thresholds.maxVendorDailyAmount).toBe(10000);
    });
  });
});