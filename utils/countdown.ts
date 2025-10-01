// utils/countdown.ts
export const calculateCountdown = (countdownStart: string | null, duration: number = 10): number => {
  if (!countdownStart) return 0;
  
  try {
    // Untuk timestamp with time zone, langsung parse sebagai Date
    const startTime = new Date(countdownStart).getTime();
    const now = new Date().getTime();
    
    // Handle invalid dates
    if (isNaN(startTime)) {
      console.error('Invalid countdown_start date:', countdownStart);
      return 0;
    }
    
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = Math.max(0, duration - elapsed);
    
    console.log(`Countdown calc: start=${countdownStart}, startTime=${startTime}, now=${now}, elapsed=${elapsed}s, remaining=${remaining}s`);
    
    return remaining;
  } catch (error) {
    console.error('Error calculating countdown:', error);
    return 0;
  }
};