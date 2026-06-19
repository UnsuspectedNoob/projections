import React from 'react';
import PiggyvestCalculator from './components/PiggyvestCalculator';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen bg-background transition-colors duration-300">
        <ThemeSwitcher />
        <PiggyvestCalculator />
      </div>
    </ThemeProvider>
  );
};

export default App;
