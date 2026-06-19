import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Wallet, Banknote, RefreshCw, CalendarIcon, Info } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { startOfYear, addDays, isAfter, isSameDay, startOfDay, format, isBefore } from 'date-fns';
import type { BreakdownItem, CalculationResult } from '../types';

// Custom DatePicker Component with Popover and "TODAY" button
const DatePickerTrigger = ({ date, setDate, disabledDays, label, badge }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSetToday = () => {
    const today = new Date();
    // Verify today isn't disabled
    let isDisabled = false;
    if (Array.isArray(disabledDays)) {
      // Very basic check for our specific disabled rules (e.g. [{before: ...}])
      const rule = disabledDays.find(d => d.before);
      if (rule && isBefore(today, rule.before)) {
        isDisabled = true;
      }
    }
    
    if (!isDisabled) {
      setDate(today);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <label className="text-sm font-medium text-gray-600 flex items-center justify-between mb-2">
        {label}
        {badge && <span className="text-xs text-blue-500 font-semibold bg-blue-50 px-2 py-1 rounded-md">{badge}</span>}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700 font-semibold hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-blue-500" />
          {date ? format(date, 'MMM do, yyyy') : 'Select date'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 min-w-[300px]"
            style={{ '--rdp-accent-color': '#0d60d8' } as any}
          >
            <div className="flex justify-between items-center mb-2 px-2 border-b border-gray-100 pb-2">
               <span className="text-sm font-bold text-[#082552]">Select Date</span>
               <button 
                 onClick={handleSetToday}
                 className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
               >
                 TODAY
               </button>
            </div>
            <DayPicker
              mode="single"
              selected={date}
              defaultMonth={date || new Date()}
              onSelect={(d) => { if(d) { setDate(d); setIsOpen(false); } }}
              disabled={disabledDays}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function PiggyvestCalculator() {
  const [principal, setPrincipal] = useState<number>(500000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(50000);
  const [rate, setRate] = useState<number>(10);
  
  // Date states with defaults: Start = Jan 1st of current year, End = Today
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Business Logic & Calculations
  const calcData = useMemo<CalculationResult>(() => {
    let currentPrincipal = Number(principal) || 0;
    const contribution = Number(monthlyContribution) || 0;
    const annualRate = Number(rate) || 0;
    const dailyRate = (annualRate / 100) / 365;

    let totalInterestAccrued = 0;
    let totalInterestCredited = 0;
    let totalContributions = 0;

    const breakdown: BreakdownItem[] = [];

    // Safety check for valid date range
    if (!startDate || !endDate || isBefore(endDate, startDate)) {
      return {
        breakdown: [], finalBalance: currentPrincipal, totalInterestAccrued: 0, 
        totalInterestCredited: 0, totalContributions: 0, simpleInterest: 0, extraGained: 0, maxInterest: 0, pendingInterest: 0
      };
    }

    let currentDate = startOfDay(startDate);
    const finalDate = startOfDay(endDate);

    let currentMonthInterest = 0;
    let currentMonthContribution = 0;
    let monthStartBalance = currentPrincipal;

    let currentMonthStr = format(currentDate, 'MMM yyyy');

    let simpleBase = currentPrincipal; // Track simple interest base (deposits only)
    let totalSimpleInterestAccrued = 0;

    // Loop through exact days
    while (!isAfter(currentDate, finalDate)) {
      // 1. Payout Rule: 1st of the month (and not the very first day)
      if (currentDate.getDate() === 1 && !isSameDay(currentDate, startOfDay(startDate))) {
        // Payout the accrued interest from previous month
        currentPrincipal += currentMonthInterest;
        totalInterestCredited += currentMonthInterest;

        // Save previous month record
        breakdown.push({
          date: new Date(currentDate), // The payout date
          monthName: currentMonthStr,
          startingBalance: monthStartBalance,
          interestEarned: currentMonthInterest,
          contribution: currentMonthContribution,
          endingBalance: currentPrincipal, // Balance after interest credited
          isPayoutMonth: true
        });

        // Reset for the new month
        currentMonthStr = format(currentDate, 'MMM yyyy');
        currentMonthInterest = 0;

        // Apply new monthly contribution exactly on the 1st
        currentPrincipal += contribution;
        currentMonthContribution = contribution;
        totalContributions += contribution;
        simpleBase += contribution;
        
        monthStartBalance = currentPrincipal;
      }

      // 2. Accrue daily interest
      // Note: Piggyvest calculates interest on the current balance overnight.
      const dailyInterest = currentPrincipal * dailyRate;
      currentMonthInterest += dailyInterest;
      totalInterestAccrued += dailyInterest;

      // Accrue daily simple interest
      totalSimpleInterestAccrued += simpleBase * dailyRate;

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // 3. Handle the final partial month (if the end date is not the last day before a payout)
    let pendingInterest = 0;
    if (currentMonthInterest > 0) {
      pendingInterest = currentMonthInterest;
      breakdown.push({
        date: new Date(finalDate),
        monthName: `${currentMonthStr} (Partial)`,
        startingBalance: monthStartBalance,
        interestEarned: currentMonthInterest,
        contribution: currentMonthContribution,
        endingBalance: monthStartBalance, // Crucial: Interest NOT added to final balance
        isPayoutMonth: false
      });
    }

    // Exact comparison vs simple interest
    const extraGained = totalInterestAccrued - totalSimpleInterestAccrued; 

    const maxInterest = breakdown.length > 0 ? Math.max(...breakdown.map(m => m.interestEarned)) : 0;

    return {
      breakdown,
      finalBalance: currentPrincipal, // Usable balance, doesn't include pending partial month interest
      totalInterestAccrued,
      totalInterestCredited,
      totalContributions,
      simpleInterest: Math.max(0, totalSimpleInterestAccrued),
      extraGained: Math.max(0, extraGained),
      maxInterest,
      pendingInterest
    };
  }, [principal, monthlyContribution, rate, startDate, endDate]);

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatCompactNaira = (value: number) => {
    if (value >= 1_000_000_000) {
      return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    }
    if (value >= 1_000_000) {
      return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (value >= 1_000) {
      return `₦${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `₦${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as BreakdownItem;
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 min-w-[200px]">
          <p className="font-bold text-[#082552] mb-3 border-b border-gray-50 pb-2">{data.monthName}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 flex justify-between">Start Balance: <span className="font-semibold text-gray-700">{formatNaira(data.startingBalance)}</span></p>
            {data.contribution > 0 && <p className="text-sm text-green-600 flex justify-between">Auto-save: <span className="font-semibold">+{formatNaira(data.contribution)}</span></p>}
            <p className="text-sm text-blue-600 flex justify-between">Interest: <span className="font-semibold">+{formatNaira(data.interestEarned)}</span></p>
            {!data.isPayoutMonth && <p className="text-xs text-amber-500 bg-amber-50 rounded px-2 py-1 mt-1 inline-block">Pending Payout</p>}
          </div>
        </div>
      );
    }
    return null;
  };

  // The End Date must be at least Start Date + 2 days
  const disabledEndDates = [
    { before: addDays(startDate, 2) }
  ];

  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '') {
      setter(0);
      return;
    }
    if (!isNaN(Number(rawValue))) {
      setter(Number(rawValue));
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-gray-800 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-4 shadow-sm">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-[#082552] tracking-tight">Piggyvest Projection</h1>
          <p className="text-gray-500 max-w-xl mx-auto">Visualize your wealth growth using precise 1st-of-the-month Piggyvest compounding.</p>
        </motion.div>

        {/* Top Section: Inputs and Summary side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6 relative overflow-visible z-10"
          >
            <h2 className="text-xl font-bold text-[#082552] flex items-center gap-2 border-b border-gray-50 pb-4">
              <Wallet className="text-blue-500" size={24} /> Investment Details
            </h2>

            <div className="space-y-5 relative">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Starting Principal (₦)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium">₦</span>
                  </div>
                  <input
                    type="text"
                    value={principal === 0 ? '0' : new Intl.NumberFormat('en-US').format(principal)}
                    onChange={(e) => handleCurrencyInput(e, setPrincipal)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Monthly Auto-save (₦)
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Info size={12}/> Added on 1st</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium">₦</span>
                  </div>
                  <input
                    type="text"
                    value={monthlyContribution === 0 ? '0' : new Intl.NumberFormat('en-US').format(monthlyContribution)}
                    onChange={(e) => handleCurrencyInput(e, setMonthlyContribution)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center justify-between">
                  Annual Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={rate === 0 ? '' : rate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRate(val === '' ? 0 : Number(val));
                    }}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-700 font-semibold"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium">%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex gap-4">
                <div className="flex-1">
                  <DatePickerTrigger 
                    date={startDate} 
                    setDate={setStartDate} 
                    label="Start Date"
                  />
                </div>
                <div className="flex-1">
                  <DatePickerTrigger 
                    date={endDate} 
                    setDate={setEndDate} 
                    label="End Date"
                    disabledDays={disabledEndDates}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Summary Cards Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            {/* Main Balance Card */}
            <div className="bg-gradient-to-br from-[#0d60d8] to-[#082552] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-blue-200 font-medium flex items-center gap-2">
                    <Banknote size={18} /> Available Balance
                  </p>
                  {calcData.pendingInterest > 0 && (
                    <div className="bg-blue-900/50 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-200 flex items-center gap-1 border border-blue-400/20 shadow-inner">
                      <RefreshCw size={12} className="animate-spin-slow" /> +{formatNaira(calcData.pendingInterest)} pending payout
                    </div>
                  )}
                </div>
                <div className="text-5xl font-black tracking-tight mb-6">
                  {formatNaira(calcData.finalBalance)}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-blue-400/30 pt-6">
                  <div>
                    <p className="text-blue-200 text-sm mb-1">Total Invested</p>
                    <p className="text-xl font-bold">{formatNaira((Number(principal) || 0) + calcData.totalContributions)}</p>
                  </div>
                  <div>
                    <p className="text-green-300 text-sm mb-1">Interest Credited</p>
                    <p className="text-xl font-bold">+{formatNaira(calcData.totalInterestCredited)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Minor Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Extra vs Simple Interest</p>
                  <p className="text-lg font-bold text-gray-800">+{formatNaira(calcData.extraGained)}</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Accrued</p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatNaira(calcData.totalInterestAccrued)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Growth Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#082552]">Balance Growth Timeline</h2>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Info size={14}/> Graph maps each monthly compounding event
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calcData.breakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d60d8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d60d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="monthName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#888', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#888', fontSize: 12 }}
                  tickFormatter={formatCompactNaira}
                  width={80}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area 
                  type="stepAfter" 
                  dataKey="endingBalance" 
                  stroke="#0d60d8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                  activeDot={{ r: 6, fill: '#0d60d8', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#082552]">Payout History & Timeline</h2>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Dates exactly map to 1st of month payouts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 whitespace-nowrap">Timeline</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 whitespace-nowrap">Start Balance</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 whitespace-nowrap">Auto-save</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 whitespace-nowrap">Interest Accrued</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 whitespace-nowrap">Credited Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calcData.breakdown.map((row, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${!row.isPayoutMonth ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700">{row.monthName}</span>
                        {!row.isPayoutMonth && <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Pending</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">{formatNaira(row.startingBalance)}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">{row.contribution > 0 ? formatNaira(row.contribution) : '-'}</td>
                    <td className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${row.isPayoutMonth ? 'text-green-600' : 'text-amber-500'}`}>
                      +{formatNaira(row.interestEarned)}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-[#082552] whitespace-nowrap">
                      {formatNaira(row.endingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
