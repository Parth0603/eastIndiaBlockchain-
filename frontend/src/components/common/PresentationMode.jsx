import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Eye, EyeOff, Settings } from 'lucide-react';

const PresentationMode = ({ onStepChange, totalSteps = 8 }) => {
  // Disable presentation mode in production
  if (import.meta.env.PROD) {
    return null;
  }
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAutoAdvance, setIsAutoAdvance] = useState(false);
  const [stepDuration, setStepDuration] = useState(180); // 3 minutes default
  const [timeRemaining, setTimeRemaining] = useState(stepDuration);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const presentationSteps = [
    {
      id: 1,
      title: "Problem Statement",
      duration: 120, // 2 minutes
      description: "Explain current disaster relief challenges and introduce blockchain solution",
      route: "/",
      highlights: ["Transparency issues", "Inefficient distribution", "Lack of accountability"]
    },
    {
      id: 2,
      title: "System Overview",
      duration: 180, // 3 minutes
      description: "Navigate through landing page and 'How It Works'",
      route: "/how-it-works",
      highlights: ["Multi-role system", "Blockchain transparency", "Real-time tracking"]
    },
    {
      id: 3,
      title: "Donor Journey",
      duration: 240, // 4 minutes
      description: "Demonstrate donation process and impact tracking",
      route: "/donor",
      highlights: ["Wallet connection", "Donation interface", "Impact visualization", "Real-time updates"]
    },
    {
      id: 4,
      title: "Beneficiary Journey",
      duration: 180, // 3 minutes
      description: "Show beneficiary dashboard and spending process",
      route: "/beneficiary",
      highlights: ["Fund allocation", "Spending interface", "Transaction history"]
    },
    {
      id: 5,
      title: "Transparency Features",
      duration: 180, // 3 minutes
      description: "Public transparency dashboard and verification",
      route: "/transparency",
      highlights: ["Public statistics", "Transaction search", "Fund flow visualization"]
    },
    {
      id: 6,
      title: "Admin/Verifier Features",
      duration: 120, // 2 minutes
      description: "Administrative controls and fraud monitoring",
      route: "/admin",
      highlights: ["System statistics", "User management", "Fraud detection", "Real-time notifications"]
    },
    {
      id: 7,
      title: "Technical Highlights",
      duration: 120, // 2 minutes
      description: "Smart contracts, WebSocket, and API features",
      route: "/",
      highlights: ["Smart contract architecture", "Real-time updates", "Comprehensive API"]
    },
    {
      id: 8,
      title: "Q&A and Wrap-up",
      duration: 60, // 1 minute
      description: "Questions and closing remarks",
      route: "/",
      highlights: ["Questions", "Contact information", "Thank you"]
    }
  ];

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (isAutoAdvance && currentStep < totalSteps) {
              handleNextStep();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining, isAutoAdvance, currentStep, totalSteps]);

  // Update timer when step changes
  useEffect(() => {
    const step = presentationSteps.find(s => s.id === currentStep);
    if (step) {
      setTimeRemaining(step.duration);
      setStepDuration(step.duration);
    }
  }, [currentStep]);

  // Notify parent component of step changes
  useEffect(() => {
    if (onStepChange) {
      const step = presentationSteps.find(s => s.id === currentStep);
      onStepChange(currentStep, step);
    }
  }, [currentStep, onStepChange]);

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      setIsTimerRunning(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setIsTimerRunning(false);
    }
  };

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    const step = presentationSteps.find(s => s.id === currentStep);
    setTimeRemaining(step?.duration || stepDuration);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStepData = presentationSteps.find(s => s.id === currentStep);
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  if (!isActive) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsActive(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          title="Enable Presentation Mode"
        >
          <Play className="w-4 h-4" />
          <span>Presentation Mode</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg">
      {/* Main presentation bar */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Step info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <div className="w-32 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            
            <div className="border-l border-gray-600 pl-4">
              <h3 className="font-semibold">{currentStepData?.title}</h3>
              <p className="text-sm text-gray-300">{currentStepData?.description}</p>
            </div>
          </div>

          {/* Timer and controls */}
          <div className="flex items-center space-x-4">
            {/* Timer */}
            <div className="flex items-center space-x-2">
              <div className={`text-lg font-mono ${timeRemaining < 30 ? 'text-red-400' : 'text-green-400'}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="flex space-x-1">
                {isTimerRunning ? (
                  <button
                    onClick={handlePauseTimer}
                    className="p-1 hover:bg-gray-700 rounded"
                    title="Pause Timer"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartTimer}
                    className="p-1 hover:bg-gray-700 rounded"
                    title="Start Timer"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleResetTimer}
                  className="p-1 hover:bg-gray-700 rounded text-xs"
                  title="Reset Timer"
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center space-x-2 border-l border-gray-600 pl-4">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleNextStep}
                disabled={currentStep === totalSteps}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Settings */}
            <div className="flex items-center space-x-2 border-l border-gray-600 pl-4">
              <button
                onClick={() => setIsAutoAdvance(!isAutoAdvance)}
                className={`p-2 rounded ${isAutoAdvance ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="Auto Advance"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsActive(false)}
                className="p-2 hover:bg-gray-700 rounded"
                title="Hide Presentation Mode"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Step highlights */}
        {currentStepData?.highlights && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Key Points:</span>
              <div className="flex flex-wrap gap-2">
                {currentStepData.highlights.map((highlight, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-600 bg-opacity-20 text-blue-300 text-xs rounded"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="h-1 bg-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default PresentationMode;