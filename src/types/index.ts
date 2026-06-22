export interface BreakdownItem {
  date: Date;
  monthName: string;
  startingBalance: number;
  interestEarned: number;
  contribution: number;
  endingBalance: number;
  isPayoutMonth: boolean; // true if this row represents a month where interest was credited
}

export interface CalculationResult {
  breakdown: BreakdownItem[];
  finalBalance: number;
  totalInterestAccrued: number; 
  totalInterestCredited: number; 
  totalContributions: number;
  simpleInterest: number;
  extraGained: number;
  maxInterest: number;
  pendingInterest: number; 
  inflationAdjustedBalance: number; // Value of the final balance in today's money
  trueGoalReachedDate: Date | null; // The exact date the target goal was crossed in infinite projection
  goalStatus: 'REACHED' | 'IMPOSSIBLE' | 'OVER_100_YEARS' | 'PENDING';
}
