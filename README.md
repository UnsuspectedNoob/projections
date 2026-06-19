# Piggyvest Projection Calculator 🐖💰

A highly precise, visually stunning web application built to simulate and project your wealth using Piggyvest's exact 1st-of-the-month compound interest mechanics.

## Features ✨

*   **Exact Math Engine:** Unlike generic compound interest calculators, this engine replicates Piggyvest's exact daily accrual and strict 1st-of-the-month payout/auto-save mechanics.
*   **Pristine UI:** Built with Tailwind CSS v4, Framer Motion, and Lucide Icons for a beautiful, premium, and glassmorphic fintech aesthetic.
*   **Dynamic Theming:** Instantly toggle between four bespoke themes (Classic Blue, Midnight Navy, Emerald Growth, and Sunset Gold) via an animated dropdown menu. The themes automatically hook into the SVG chart gradients!
*   **Interactive Dates:** Custom `react-day-picker` calendars with smart bounding, "TODAY" shortcuts, and native dropdown-button navigation spanning from 2020 to 2050.
*   **Data Visualization:** Interactive Area Charts powered by Recharts that perfectly map out your monthly growth step-by-step.
*   **Real-time Formatting:** Localized `en-NG` currency formatting (₦) with smart zero-prefix handling directly in the inputs.

## Tech Stack 🛠️

*   **Framework:** React 19 + Vite
*   **Styling:** Tailwind CSS v4
*   **Animations:** Framer Motion
*   **Icons:** Lucide React
*   **Charts:** Recharts
*   **Dates:** date-fns + react-day-picker

## Getting Started 🚀

To run the application locally:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

3.  **Build for production:**
    ```bash
    npm run build
    ```

## Vercel Deployment ☁️

This project is fully optimized for 1-click deployment to [Vercel](https://vercel.com).

Since it is built with Vite, Vercel will automatically detect the settings. No custom `vercel.json` is required. 
Simply import your GitHub repository into Vercel and it will automatically use:
*   **Framework Preset:** Vite
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
