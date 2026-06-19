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
  totalInterestAccrued: number; // Total interest calculated
  totalInterestCredited: number; // Total interest actually paid out on the 1st
  totalContributions: number;
  simpleInterest: number;
  extraGained: number;
  maxInterest: number;
  pendingInterest: number; // Interest accrued but not yet paid out because the end date wasn't the 1st
}
