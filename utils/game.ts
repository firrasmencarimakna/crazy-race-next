// utils/game.ts
export const calculateRemainingTime = (startTime: string | null, totalDuration: number = 300): number => {
  if (!startTime) return totalDuration;
  
  try {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - start) / 1000);
    const remaining = Math.max(0, totalDuration - elapsed);
    
    return remaining;
  } catch (error) {
    console.error('Error calculating remaining time:', error);
    return totalDuration;
  }
};

export const sortPlayersByProgress = (players: any[]): any[] => {
  return players
    .filter(player => player.result && player.result.length > 0)
    .sort((a, b) => {
      const aProgress = a.result[0]?.current_question || 0;
      const bProgress = b.result[0]?.current_question || 0;
      const aCorrect = a.result[0]?.correct || 0;
      const bCorrect = b.result[0]?.correct || 0;
      const aDuration = a.result[0]?.duration || 0;
      const bDuration = b.result[0]?.duration || 0;
      
      // Urutkan berdasarkan: progress (desc), correct answers (desc), duration (asc)
      if (bProgress !== aProgress) return bProgress - aProgress;
      if (bCorrect !== aCorrect) return bCorrect - aCorrect;
      return aDuration - bDuration;
    });
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};