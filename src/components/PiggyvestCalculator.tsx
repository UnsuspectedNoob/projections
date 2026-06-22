import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Banknote, RefreshCw, CalendarIcon, Info, Download, Target, ShieldAlert, Sparkles } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { startOfYear, addDays, isAfter, isSameDay, startOfDay, format, isBefore } from 'date-fns';
import type { BreakdownItem, CalculationResult } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { usePersistentState } from '../hooks/usePersistentState';

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
    let isDisabled = false;
    if (Array.isArray(disabledDays)) {
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
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={popoverRef}>
      <label className="text-sm font-medium text-text-muted flex items-center justify-between mb-2">
        {label}
        {badge && <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-1 rounded-md">{badge}</span>}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-text-main font-semibold hover:bg-surface-hover"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-primary" />
          {date ? format(date, 'MMM do, yyyy') : 'Select date'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 bg-surface rounded-2xl shadow-xl border border-border p-4 min-w-[300px]"
          >
            <div className="flex justify-between items-center mb-2 px-2 border-b border-border pb-2">
               <span className="text-sm font-bold text-text-main">Select Date</span>
               <button 
                 onClick={handleSetToday}
                 className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
               >
                 TODAY
               </button>
            </div>
            <div className="rdp-theme-wrapper">
              <DayPicker
                mode="single"
                selected={date}
                defaultMonth={date || new Date()}
                onSelect={(d) => { if(d) { setDate(d); setIsOpen(false); } }}
                disabled={disabledDays}
                captionLayout="dropdown-buttons"
                fromYear={2020}
                toYear={2050}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function PiggyvestCalculator() {
  const { primaryColor } = useTheme();
  
  // Persisted Core State
  const [principal, setPrincipal] = usePersistentState<number>('pv_principal', 500000);
  const [monthlyContribution, setMonthlyContribution] = usePersistentState<number>('pv_monthly_contrib', 0);
  const [rate, setRate] = usePersistentState<number>('pv_rate', 16);
  const [startDate, setStartDate] = usePersistentState<Date>('pv_start_date', startOfYear(new Date()), true);
  const [endDate, setEndDate] = usePersistentState<Date>('pv_end_date', new Date(), true);

  // Persisted Advanced State
  const [targetGoalEnabled, setTargetGoalEnabled] = usePersistentState<boolean>('pv_target_enabled', true);
  const [targetGoal, setTargetGoal] = usePersistentState<number>('pv_target_goal', 1500000);
  const [inflationEnabled, setInflationEnabled] = usePersistentState<boolean>('pv_inflation_enabled', false);
  const [inflationRate, setInflationRate] = usePersistentState<number>('pv_inflation_rate', 20); // 20% default Nigerian context

  // UI State
  const [activeTab, setActiveTab] = useState<'core' | 'advanced'>('core');

  const calcData = useMemo<CalculationResult>(() => {
    let currentPrincipal = Number(principal) || 0;
    const contribution = Number(monthlyContribution) || 0;
    const annualRate = Number(rate) || 0;
    const dailyRate = (annualRate / 100) / 365;
    const goal = Number(targetGoal) || 0;

    let totalInterestAccrued = 0;
    let totalInterestCredited = 0;
    let totalContributions = 0;

    const breakdown: BreakdownItem[] = [];

    if (!startDate || !endDate || isBefore(endDate, startDate)) {
      return {
        breakdown: [], finalBalance: currentPrincipal, totalInterestAccrued: 0, 
        totalInterestCredited: 0, totalContributions: 0, simpleInterest: 0, extraGained: 0, maxInterest: 0, pendingInterest: 0,
        inflationAdjustedBalance: currentPrincipal, trueGoalReachedDate: null, goalStatus: 'PENDING'
      };
    }

    let currentDate = startOfDay(startDate);
    const finalDate = startOfDay(endDate);

    let currentMonthInterest = 0;
    let currentMonthContribution = 0;
    let monthStartBalance = currentPrincipal;

    let currentMonthStr = format(currentDate, 'MMM yyyy');

    let simpleBase = currentPrincipal; 
    let totalSimpleInterestAccrued = 0;

    while (!isAfter(currentDate, finalDate)) {
      if (currentDate.getDate() === 1 && !isSameDay(currentDate, startOfDay(startDate))) {
        currentPrincipal += currentMonthInterest;
        totalInterestCredited += currentMonthInterest;

        breakdown.push({
          date: new Date(currentDate), 
          monthName: currentMonthStr,
          startingBalance: monthStartBalance,
          interestEarned: currentMonthInterest,
          contribution: currentMonthContribution,
          endingBalance: currentPrincipal, 
          isPayoutMonth: true
        });

        currentMonthStr = format(currentDate, 'MMM yyyy');
        currentMonthInterest = 0;

        currentPrincipal += contribution;
        currentMonthContribution = contribution;
        totalContributions += contribution;
        simpleBase += contribution;
        
        monthStartBalance = currentPrincipal;
      }

      const dailyInterest = currentPrincipal * dailyRate;
      currentMonthInterest += dailyInterest;
      totalInterestAccrued += dailyInterest;
      totalSimpleInterestAccrued += simpleBase * dailyRate;

      currentDate = addDays(currentDate, 1);
    }

    // Secondary Decoupled Goal Projection Loop
    let trueGoalReachedDate: Date | null = null;
    let goalStatus: 'REACHED' | 'IMPOSSIBLE' | 'OVER_100_YEARS' | 'PENDING' = 'PENDING';

    if (targetGoalEnabled && goal > 0) {
      if (Number(principal) >= goal) {
        trueGoalReachedDate = new Date(startDate);
        goalStatus = 'REACHED';
      } else if (contribution === 0 && annualRate === 0) {
        goalStatus = 'IMPOSSIBLE';
      } else {
        let simPrincipal = Number(principal) || 0;
        let simDate = startOfDay(startDate);
        let simMonthInterest = 0;
        let monthsElapsed = 0;
        const maxMonths = 1200; // 100 years infinite loop cap

        while (simPrincipal < goal && monthsElapsed < maxMonths) {
          if (simDate.getDate() === 1 && !isSameDay(simDate, startOfDay(startDate))) {
             simPrincipal += simMonthInterest;
             simMonthInterest = 0;
             simPrincipal += contribution;
             monthsElapsed++;
          }
          
          if ((simPrincipal + simMonthInterest) >= goal) {
            trueGoalReachedDate = new Date(simDate);
            goalStatus = 'REACHED';
            break;
          }
          
          simMonthInterest += simPrincipal * dailyRate;
          simDate = addDays(simDate, 1);
        }

        if (!trueGoalReachedDate) {
          goalStatus = 'OVER_100_YEARS';
        }
      }
    }

    let pendingInterest = 0;
    if (currentMonthInterest > 0) {
      pendingInterest = currentMonthInterest;
      breakdown.push({
        date: new Date(finalDate),
        monthName: `${currentMonthStr} (Partial)`,
        startingBalance: monthStartBalance,
        interestEarned: currentMonthInterest,
        contribution: currentMonthContribution,
        endingBalance: monthStartBalance, 
        isPayoutMonth: false
      });
    }

    const extraGained = totalInterestAccrued - totalSimpleInterestAccrued; 
    const maxInterest = breakdown.length > 0 ? Math.max(...breakdown.map(m => m.interestEarned)) : 0;

    // Calculate Inflation
    const totalDays = (finalDate.getTime() - startOfDay(startDate).getTime()) / (1000 * 3600 * 24);
    const totalYearsElapsed = totalDays / 365;
    const inflRate = Number(inflationRate) || 0;
    const inflationAdjustedBalance = currentPrincipal / Math.pow(1 + (inflRate / 100), totalYearsElapsed);

    return {
      breakdown,
      finalBalance: currentPrincipal, 
      totalInterestAccrued,
      totalInterestCredited,
      totalContributions,
      simpleInterest: Math.max(0, totalSimpleInterestAccrued),
      extraGained: Math.max(0, extraGained),
      maxInterest,
      pendingInterest,
      inflationAdjustedBalance,
      trueGoalReachedDate,
      goalStatus
    };
  }, [principal, monthlyContribution, rate, startDate, endDate, targetGoal, targetGoalEnabled, inflationRate]);

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatCompactNaira = (value: number) => {
    if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
    if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1_000) return `₦${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₦${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as BreakdownItem;
      return (
        <div className="bg-surface p-4 rounded-xl shadow-lg border border-border min-w-[200px]">
          <p className="font-bold text-text-main mb-3 border-b border-border pb-2">{data.monthName}</p>
          <div className="space-y-1">
            <p className="text-sm text-text-muted flex justify-between">Start Balance: <span className="font-semibold text-text-main">{formatNaira(data.startingBalance)}</span></p>
            {data.contribution > 0 && <p className="text-sm text-success flex justify-between">Auto-save: <span className="font-semibold">+{formatNaira(data.contribution)}</span></p>}
            <p className="text-sm text-primary flex justify-between">Interest: <span className="font-semibold">+{formatNaira(data.interestEarned)}</span></p>
            {!data.isPayoutMonth && <p className="text-xs text-warning bg-warning-bg rounded px-2 py-1 mt-1 inline-block">Pending Payout</p>}
          </div>
        </div>
      );
    }
    return null;
  };

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

  const downloadCSV = () => {
    if (!calcData.breakdown.length) return;
    const headers = ['Date', 'Start Balance (NGN)', 'Auto-save (NGN)', 'Interest Accrued (NGN)', 'Credited Balance (NGN)', 'Status'];
    const rows = calcData.breakdown.map(row => [
      format(row.date, 'MMM do, yyyy'),
      row.startingBalance.toFixed(2),
      row.contribution.toFixed(2),
      row.interestEarned.toFixed(2),
      row.endingBalance.toFixed(2),
      row.isPayoutMonth ? 'Paid' : 'Pending'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `piggyvest_projection_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--rdp-accent-color', primaryColor);
    document.documentElement.style.setProperty('--rdp-background-color', 'var(--surface-elevated)');
  }, [primaryColor]);

  return (
    <div className="min-h-screen bg-background text-text-main font-sans p-4 md:p-8 pt-20 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-full mb-4 shadow-sm transition-colors duration-300">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-primary-focus tracking-tight transition-colors duration-300">Piggyvest Projection</h1>
          <p className="text-text-muted max-w-xl mx-auto">Visualize your wealth growth using precise 1st-of-the-month Piggyvest compounding.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 bg-surface rounded-3xl shadow-sm border border-border p-6 md:p-8 relative overflow-visible z-30 transition-colors duration-300 flex flex-col"
          >
            {/* Tabs Header */}
            <div className="flex border-b border-border mb-6">
              <button 
                onClick={() => setActiveTab('core')}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'core' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Core Settings
              </button>
              <button 
                onClick={() => setActiveTab('advanced')}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'advanced' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Advanced <Sparkles size={14}/>
              </button>
            </div>

            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {activeTab === 'core' ? (
                  <motion.div 
                    key="core"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-muted flex items-center justify-between">
                        Starting Principal (₦)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-text-muted font-medium">₦</span>
                        </div>
                        <input
                          type="text"
                          value={principal === 0 ? '0' : new Intl.NumberFormat('en-US').format(principal)}
                          onChange={(e) => handleCurrencyInput(e, setPrincipal)}
                          className="w-full pl-10 pr-4 py-3 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-muted flex items-center justify-between">
                        Monthly Auto-save (₦)
                        <span className="text-xs text-text-muted flex items-center gap-1"><Info size={12}/> Added on 1st</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-text-muted font-medium">₦</span>
                        </div>
                        <input
                          type="text"
                          value={monthlyContribution === 0 ? '0' : new Intl.NumberFormat('en-US').format(monthlyContribution)}
                          onChange={(e) => handleCurrencyInput(e, setMonthlyContribution)}
                          className="w-full pl-10 pr-4 py-3 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-muted flex items-center justify-between">
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
                          className="w-full pl-4 pr-10 py-3 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-semibold"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <span className="text-text-muted font-medium">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-4">
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
                  </motion.div>
                ) : (
                  <motion.div 
                    key="advanced"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-primary flex items-center gap-2"><Target size={18}/> Goal Tracking</h3>
                          <p className="text-xs text-text-muted mt-1">Set a target amount to visualize exactly when you will reach your financial milestone.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={targetGoalEnabled} onChange={(e) => setTargetGoalEnabled(e.target.checked)} />
                          <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      
                      <AnimatePresence>
                        {targetGoalEnabled && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-2">
                              <label className="text-sm font-medium text-text-muted mb-2 block">Target Goal (₦)</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <span className="text-text-muted font-medium">₦</span>
                                </div>
                                <input
                                  type="text"
                                  value={targetGoal === 0 ? '0' : new Intl.NumberFormat('en-US').format(targetGoal)}
                                  onChange={(e) => handleCurrencyInput(e, setTargetGoal)}
                                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main font-semibold"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="bg-warning-bg/50 border border-warning/20 rounded-xl p-5 space-y-4 mt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-warning flex items-center gap-2"><ShieldAlert size={18}/> Inflation Adjuster</h3>
                          <p className="text-xs text-text-muted mt-1">See your final balance's true purchasing power in today's money.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={inflationEnabled} onChange={(e) => setInflationEnabled(e.target.checked)} />
                          <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning"></div>
                        </label>
                      </div>
                      
                      <AnimatePresence>
                        {inflationEnabled && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-2">
                              <label className="text-sm font-medium text-text-muted flex items-center justify-between mb-2">Estimated Inflation Rate (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={inflationRate === 0 ? '' : inflationRate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInflationRate(val === '' ? 0 : Number(val));
                                  }}
                                  className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-warning focus:border-warning outline-none transition-all text-text-main font-semibold"
                                />
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                  <span className="text-text-muted font-medium">%</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Summary Cards Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 flex flex-col gap-6 relative z-10"
          >
            {/* Dynamic themed gradient card */}
            <div 
              className="rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center transition-colors duration-500"
              style={{
                background: `linear-gradient(to bottom right, ${primaryColor}, var(--primary-focus))`
              }}
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white/80 font-medium flex items-center gap-2">
                    <Banknote size={18} /> Available Balance
                  </p>
                  {calcData.pendingInterest > 0 && (
                    <div className="bg-black/20 px-3 py-1.5 rounded-lg text-xs font-medium text-white/90 flex items-center gap-1 shadow-inner">
                      <RefreshCw size={12} className="animate-spin-slow" /> +{formatNaira(calcData.pendingInterest)} pending
                    </div>
                  )}
                </div>
                <div className="text-5xl font-black tracking-tight mb-2">
                  {formatNaira(calcData.finalBalance)}
                </div>
                
                {/* Inflation Sub-text */}
                {inflationEnabled && (
                  <div className="mb-6 inline-flex items-center gap-1.5 bg-warning/20 border border-warning/30 px-3 py-1 rounded-full">
                    <ShieldAlert size={14} className="text-warning-bg" />
                    <span className="text-sm font-medium text-warning-bg">≈ {formatNaira(calcData.inflationAdjustedBalance)} real value</span>
                  </div>
                )}
                {!inflationEnabled && <div className="mb-6 h-2"></div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/20 pt-6">
                  <div>
                    <p className="text-white/80 text-sm mb-1">Total Invested</p>
                    <p className="text-xl font-bold">{formatNaira((Number(principal) || 0) + calcData.totalContributions)}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-sm mb-1">Interest Credited</p>
                    <p className="text-xl font-bold">+{formatNaira(calcData.totalInterestCredited)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Goal Tracking Alert Card */}
            {targetGoalEnabled && targetGoal > 0 && (
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl p-4 border flex items-center gap-4 shadow-sm ${calcData.goalStatus === 'REACHED' ? 'bg-success-bg border-success/30' : calcData.goalStatus === 'IMPOSSIBLE' ? 'bg-warning-bg/50 border-warning/30' : 'bg-surface border-border'}`}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${calcData.goalStatus === 'REACHED' ? 'bg-success text-white' : calcData.goalStatus === 'IMPOSSIBLE' ? 'bg-warning text-white' : 'bg-primary/10 text-primary'}`}>
                    <Target size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${calcData.goalStatus === 'REACHED' ? 'text-success' : calcData.goalStatus === 'IMPOSSIBLE' ? 'text-warning' : 'text-text-main'}`}>
                      Target: {formatNaira(targetGoal)}
                    </p>
                    <p className="text-sm text-text-muted truncate mt-0.5">
                      {calcData.goalStatus === 'REACHED' && calcData.trueGoalReachedDate
                        ? `🎉 At current rate, goal reached in ${format(calcData.trueGoalReachedDate, 'MMMM yyyy')}`
                        : calcData.goalStatus === 'IMPOSSIBLE'
                        ? 'Mathematically impossible at 0% rate and ₦0 auto-save.'
                        : calcData.goalStatus === 'OVER_100_YEARS'
                        ? 'Will take over 100 years to reach.'
                        : 'Calculating...'}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface rounded-3xl p-6 shadow-sm border border-border flex items-center gap-4 transition-colors duration-300">
                <div className="p-3 bg-success-bg text-success rounded-2xl shrink-0">
                  <TrendingUp size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-text-muted font-medium truncate">Extra vs Simple Interest</p>
                  <p className="text-lg font-bold text-text-main truncate">+{formatNaira(calcData.extraGained)}</p>
                </div>
              </div>
              <div className="bg-surface rounded-3xl p-6 shadow-sm border border-border flex items-center gap-4 transition-colors duration-300">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                  <CalendarIcon size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-text-muted font-medium truncate">Total Accrued</p>
                  <p className="text-lg font-bold text-text-main truncate">
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
          className="bg-surface rounded-3xl shadow-sm border border-border p-6 md:p-8 transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-text-main">Balance Growth Timeline</h2>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <Info size={14}/> Graph maps each monthly compounding event
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calcData.breakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="monthName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={formatCompactNaira}
                  width={80}
                />
                {targetGoalEnabled && targetGoal > 0 && (
                  <ReferenceLine 
                    y={targetGoal} 
                    stroke="var(--warning)" 
                    strokeDasharray="4 4" 
                    label={{ position: 'insideTopLeft', value: 'TARGET GOAL', fill: 'var(--warning)', fontSize: 10, fontWeight: 'bold' }} 
                  />
                )}
                <RechartsTooltip content={<CustomTooltip />} />
                <Area 
                  type="stepAfter" 
                  dataKey="endingBalance" 
                  stroke={primaryColor} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                  activeDot={{ r: 6, fill: primaryColor, stroke: 'var(--surface)', strokeWidth: 2 }}
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
          className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden transition-colors duration-300"
        >
          <div className="p-6 md:p-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">Payout History</h2>
              <p className="text-xs font-semibold text-text-muted mt-1">Dates exactly map to 1st of month payouts</p>
            </div>
            <button 
              onClick={downloadCSV}
              className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-elevated">
                  <th className="py-4 px-6 text-sm font-semibold text-text-muted whitespace-nowrap">Timeline</th>
                  <th className="py-4 px-6 text-sm font-semibold text-text-muted whitespace-nowrap">Start Balance</th>
                  <th className="py-4 px-6 text-sm font-semibold text-text-muted whitespace-nowrap">Auto-save</th>
                  <th className="py-4 px-6 text-sm font-semibold text-text-muted whitespace-nowrap">Interest Accrued</th>
                  <th className="py-4 px-6 text-sm font-semibold text-text-muted whitespace-nowrap">Credited Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calcData.breakdown.map((row, idx) => (
                  <tr key={idx} className={`hover:bg-surface-hover transition-colors ${!row.isPayoutMonth ? 'bg-warning-bg/50' : ''}`}>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text-main">{row.monthName}</span>
                        {!row.isPayoutMonth && <span className="text-[10px] text-warning font-bold uppercase tracking-wider mt-0.5">Pending</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-muted whitespace-nowrap">{formatNaira(row.startingBalance)}</td>
                    <td className="py-4 px-6 text-sm text-text-muted whitespace-nowrap">{row.contribution > 0 ? formatNaira(row.contribution) : '-'}</td>
                    <td className={`py-4 px-6 text-sm font-medium whitespace-nowrap ${row.isPayoutMonth ? 'text-success' : 'text-warning'}`}>
                      +{formatNaira(row.interestEarned)}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-text-main whitespace-nowrap">
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
