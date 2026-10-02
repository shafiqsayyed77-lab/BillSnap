/**
 * Floating Pill Bottom Navigation (BottomNav.jsx)
 * -----------------------------------------------
 * Signature mobile navigation bar floating above content:
 * - Home (/)
 * - Bills (/bills)
 * - Raised Gold Circular Scan Button in the center (/scan)
 * - Analytics / Insights (/expenses)
 * - Profile & Settings (/profile)
 * 
 * Ergonomics & Accessibility:
 * Every tap target is at least 44px x 44px for effortless one-handed thumb interaction.
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Receipt, Scan, PieChart, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  // Hide bottom nav on login/signup screen
  if (location.pathname === '/login') {
    return null;
  }

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Bills', path: '/bills', icon: Receipt },
    // Center element is custom raised scan button
    { label: 'Scan', path: '/scan', isScan: true },
    { label: 'Insights', path: '/expenses', icon: PieChart },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto max-w-[430px] w-full bg-[#3A2E5C] text-white/70 rounded-full px-3 py-2 shadow-nav flex items-center justify-between border border-white/10 backdrop-blur-lg"
      >
        {navItems.map((item, index) => {
          if (item.isScan) {
            const isScanActive = location.pathname === '/scan';
            return (
              <NavLink
                key={index}
                to="/scan"
                className="relative -top-5 flex flex-col items-center group focus:outline-none"
                aria-label="Scan new bill"
              >
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-tr from-[#FFB82E] to-[#FFC857] text-[#2B2147] flex items-center justify-center shadow-scan transition-transform duration-200 group-hover:scale-105 active:scale-95 border-4 border-lilac-bg ${
                    isScanActive ? 'ring-2 ring-white scale-105' : ''
                  }`}
                >
                  <Scan className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-white mt-1">Scan</span>
              </NavLink>
            );
          }

          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={index}
              to={item.path}
              className={`min-w-[48px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 transition-all duration-200 ${
                isActive
                  ? 'text-[#FFC857] font-semibold'
                  : 'text-white/60 hover:text-white/90 active:scale-95'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
