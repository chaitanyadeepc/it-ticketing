import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for OTP countdown timer
 * @param {number} initialTime - Initial time in seconds (default: 120)
 * @returns {object} Timer state and controls
 */
export const useOTPTimer = (initialTime = 120) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let interval;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsExpired(false);
  }, []);

  const reset = useCallback((newTime = initialTime) => {
    setTimeRemaining(newTime);
    setIsExpired(false);
    setIsRunning(false);
  }, [initialTime]);

  const restart = useCallback((newTime = initialTime) => {
    setTimeRemaining(newTime);
    setIsExpired(false);
    setIsRunning(true);
  }, [initialTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const formatTime = useCallback(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  const isUrgent = timeRemaining <= 30 && timeRemaining > 0;

  return {
    timeRemaining,
    isRunning,
    isExpired,
    isUrgent,
    formatTime,
    start,
    stop,
    reset,
    restart
  };
};
