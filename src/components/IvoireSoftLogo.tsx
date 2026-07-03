import React from 'react';

interface IvoireSoftLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  withBackground?: boolean;
}

/**
 * High-fidelity, theme-adaptive SVG & typographic implementation of the 
 * official "Ivoire Soft Solutions Numériques" logo.
 */
export default function IvoireSoftLogo({ 
  className = '', 
  size = 'md', 
  showText = true,
  withBackground = true
}: IvoireSoftLogoProps) {
  
  // Dimensions based on size preset
  const dimensions = {
    sm: { icon: 'w-8 h-8', textTitle: 'text-sm', textSub: 'text-[7px]' },
    md: { icon: 'w-12 h-12', textTitle: 'text-lg', textSub: 'text-[9px]' },
    lg: { icon: 'w-16 h-16', textTitle: 'text-2xl', textSub: 'text-[11px]' },
    xl: { icon: 'w-24 h-24', textTitle: 'text-3xl', textSub: 'text-[13px]' },
  }[size];

  // Background padding styles based on size
  const bgPadding = withBackground ? {
    sm: 'px-2.5 py-1 rounded-lg',
    md: 'px-3.5 py-1.5 rounded-xl',
    lg: 'px-5 py-2.5 rounded-2xl',
    xl: 'px-6 py-4 rounded-[24px]',
  }[size] : '';

  const backgroundClasses = withBackground
    ? 'bg-white/90 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300'
    : '';

  return (
    <div 
      className={`flex items-center gap-3 ${bgPadding} ${backgroundClasses} ${className} select-none`} 
      id="ivoiresoft-brand-logo"
    >
      {/* High-Fidelity SVG Geometric Elephant Emblem */}
      <div className={`${dimensions.icon} relative flex-shrink-0`} aria-label="Ivoire Soft Logo">
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full transform transition-transform duration-300 hover:rotate-6"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for gradients to match the user's logo colors perfectly */}
          <defs>
            {/* Gold/Orange gradient */}
            <linearGradient id="logoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DE851F" />
              <stop offset="100%" stopColor="#F5A623" />
            </linearGradient>
            
            {/* Teal/Blue gradient */}
            <linearGradient id="logoTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1D9ED5" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>

            {/* Dark/Slate gradient for corporate look */}
            <linearGradient id="logoSlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2E3A4E" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
          </defs>

          {/* BACKGROUND CIRCULAR ORBITS / DIGITAL NODES */}
          {/* Main outer orbital orbit */}
          <path 
            d="M 100,10 A 90,90 0 1,1 99.9,10" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray="4 8" 
            className="text-gray-400/30 dark:text-white/20"
          />
          
          {/* Secondary inner orbital arc (gold to teal look) */}
          <path 
            d="M 30,150 A 80,80 0 0,1 170,150" 
            stroke="url(#logoGoldGrad)" 
            strokeWidth="1" 
            strokeLinecap="round"
            opacity="0.6"
          />
          <path 
            d="M 170,150 A 80,80 0 0,1 30,150" 
            stroke="url(#logoTealGrad)" 
            strokeWidth="1" 
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Orbit Nodes (Circuit connections) */}
          <circle cx="100" cy="10" r="4" fill="#DE851F" />
          <circle cx="190" cy="100" r="3" fill="#1D9ED5" />
          <circle cx="10" cy="100" r="3" fill="#DE851F" />
          <circle cx="160" cy="40" r="2" fill="currentColor" className="text-gray-400 dark:text-gray-500" />
          <circle cx="40" cy="160" r="4" fill="#DE851F" />
          <circle cx="150" cy="165" r="3" fill="#1D9ED5" />

          {/* Leaves Details (Digital & Organic harmony) */}
          {/* Left golden leaf */}
          <path 
            d="M 15,90 C 8,90 2,82 5,75 C 12,78 18,84 15,90 Z" 
            fill="#DE851F" 
          />
          <line x1="5" y1="75" x2="15" y2="90" stroke="#DE851F" strokeWidth="1" />

          {/* Right teal leaves at the end of trunk path */}
          <g transform="translate(145, 45) rotate(45)">
            <path d="M0,0 C5,-10 15,-10 15,-5 C10,5 5,5 0,0 Z" fill="#1D9ED5" />
            <path d="M0,0 C-10,-5 -10,-15 -5,-15 C5,-10 5,-5 0,0 Z" fill="#1D9ED5" opacity="0.8" />
          </g>

          {/* GEOMETRIC ELEPHANT CONSTELLATION / POLYGONS */}
          {/* Draw connecting background network lines */}
          <g stroke="currentColor" strokeWidth="0.75" className="text-gray-400/40 dark:text-white/20">
            {/* Forehead to Ear */}
            <line x1="100" y1="55" x2="135" y2="45" />
            <line x1="100" y1="55" x2="80" y2="65" />
            {/* Ear outline */}
            <line x1="80" y1="65" x2="65" y2="90" />
            <line x1="65" y1="90" x2="85" y2="105" />
            <line x1="85" y1="105" x2="100" y2="90" />
            <line x1="100" y1="90" x2="100" y2="55" />
            
            {/* Trunk geometric segments */}
            <line x1="135" y1="45" x2="155" y2="60" />
            <line x1="155" y1="60" x2="160" y2="85" />
            <line x1="160" y1="85" x2="145" y2="100" />
            <line x1="145" y1="100" x2="125" y2="105" />
            {/* Tusk */}
            <line x1="125" y1="105" x2="148" y2="115" />
            <line x1="148" y1="115" x2="125" y2="105" />

            {/* Back & Hindquarters */}
            <line x1="80" y1="65" x2="55" y2="75" />
            <line x1="55" y1="75" x2="45" y2="95" />
            <line x1="45" y1="95" x2="52" y2="130" />
            
            {/* Legs */}
            <line x1="52" y1="130" x2="48" y2="160" /> {/* Back Left */}
            <line x1="52" y1="130" x2="62" y2="160" /> {/* Back Right */}
            <line x1="85" y1="105" x2="82" y2="162" /> {/* Front Left */}
            <line x1="100" y1="90" x2="102" y2="162" /> {/* Front Right */}
            
            {/* Stomach */}
            <line x1="52" y1="130" x2="85" y2="105" />
          </g>

          {/* Overlay Polygon Fills for depth */}
          <polygon points="100,55 135,45 115,75" fill="url(#logoGoldGrad)" opacity="0.15" />
          <polygon points="80,65 65,90 85,105" fill="url(#logoGoldGrad)" opacity="0.1" />
          <polygon points="135,45 155,60 125,105" fill="url(#logoTealGrad)" opacity="0.1" />
          <polygon points="55,75 45,95 65,90" fill="url(#logoGoldGrad)" opacity="0.08" />

          {/* Polygon Vertices / Node Points (Glowy Dots) */}
          <g>
            {/* Head/Ear nodes */}
            <circle cx="100" cy="55" r="3.5" fill="#DE851F" />
            <circle cx="135" cy="45" r="3" fill="#1D9ED5" />
            <circle cx="115" cy="75" r="2.5" fill="#DE851F" />
            <circle cx="80" cy="65" r="3" fill="#DE851F" />
            <circle cx="65" cy="90" r="3.5" fill="#DE851F" />
            <circle cx="85" cy="105" r="3" fill="#DE851F" />
            <circle cx="100" cy="90" r="2.5" fill="#1D9ED5" />
            
            {/* Back & Tail nodes */}
            <circle cx="55" cy="75" r="3" fill="#DE851F" />
            <circle cx="45" cy="95" r="3" fill="#DE851F" />
            <circle cx="52" cy="130" r="3.5" fill="#DE851F" />
            
            {/* Trunk & Tusk nodes */}
            <circle cx="155" cy="60" r="3.5" fill="#1D9ED5" />
            <circle cx="160" cy="85" r="3" fill="#1D9ED5" />
            <circle cx="145" cy="100" r="2.5" fill="#1D9ED5" />
            <circle cx="125" cy="105" r="3" fill="#1D9ED5" />
            <circle cx="148" cy="115" r="2" fill="#1D9ED5" /> {/* Tusk tip */}
            
            {/* Feet nodes */}
            <circle cx="48" cy="160" r="3" fill="#DE851F" />
            <circle cx="62" cy="160" r="3" fill="#DE851F" />
            <circle cx="82" cy="162" r="3" fill="#1D9ED5" />
            <circle cx="102" cy="162" r="3.5" fill="#1D9ED5" />
          </g>
        </svg>
      </div>

      {/* Typography Layout matching the exact structure of the user logo */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-baseline">
            <span className={`font-sans font-black tracking-wide ${dimensions.textTitle} text-orange-500 dark:text-orange-400 uppercase`}>
              Ivoire
            </span>
            <span className={`font-sans font-extrabold tracking-wide ${dimensions.textTitle} text-[#2E3A4E] dark:text-slate-100 uppercase ml-0.5`}>
              Soft
            </span>
          </div>
          <span className={`font-mono font-semibold tracking-[0.2em] ${dimensions.textSub} text-[#1D9ED5] dark:text-sky-400 uppercase mt-0.5`}>
            Solutions Numériques
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to return raw high-fidelity inline SVG HTML for generating PDF / Invoices.
 * This guarantees the printed invoices look perfectly branded with the user logo.
 */
export function getLogoSvgHtml() {
  return `
    <div style="display: flex; align-items: center; gap: 12px; font-family: 'Helvetica Neue', Arial, sans-serif;">
      <!-- Vector Logo Icon -->
      <svg viewBox="0 0 200 200" style="width: 48px; height: 48px;" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 100,10 A 90,90 0 1,1 99.9,10" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 8" opacity="0.4" />
        <path d="M 30,150 A 80,80 0 0,1 170,150" stroke="#DE851F" stroke-width="1" opacity="0.6" />
        <path d="M 170,150 A 80,80 0 0,1 30,150" stroke="#1D9ED5" stroke-width="1" opacity="0.6" />
        <circle cx="100" cy="10" r="4" fill="#DE851F" />
        <circle cx="190" cy="100" r="3" fill="#1D9ED5" />
        <circle cx="10" cy="100" r="3" fill="#DE851F" />
        <circle cx="40" cy="160" r="4" fill="#DE851F" />
        <circle cx="150" cy="165" r="3" fill="#1D9ED5" />
        
        <path d="M 15,90 C 8,90 2,82 5,75 C 12,78 18,84 15,90 Z" fill="#DE851F" />
        <line x1="5" y1="75" x2="15" y2="90" stroke="#DE851F" stroke-width="1" />
        
        <g transform="translate(145, 45) rotate(45)">
          <path d="M0,0 C5,-10 15,-10 15,-5 C10,5 5,5 0,0 Z" fill="#1D9ED5" />
          <path d="M0,0 C-10,-5 -10,-15 -5,-15 C5,-10 5,-5 0,0 Z" fill="#1D9ED5" opacity="0.8" />
        </g>
        
        <g stroke="#94a3b8" stroke-width="0.75" opacity="0.8">
          <line x1="100" y1="55" x2="135" y2="45" />
          <line x1="100" y1="55" x2="80" y2="65" />
          <line x1="80" y1="65" x2="65" y2="90" />
          <line x1="65" y1="90" x2="85" y2="105" />
          <line x1="85" y1="105" x2="100" y2="90" />
          <line x1="100" y1="90" x2="100" y2="55" />
          <line x1="135" y1="45" x2="155" y2="60" />
          <line x1="155" y1="60" x2="160" y2="85" />
          <line x1="160" y1="85" x2="145" y2="100" />
          <line x1="145" y1="100" x2="125" y2="105" />
          <line x1="125" y1="105" x2="148" y2="115" />
          <line x1="80" y1="65" x2="55" y2="75" />
          <line x1="55" y1="75" x2="45" y2="95" />
          <line x1="45" y1="95" x2="52" y2="130" />
          <line x1="52" y1="130" x2="48" y2="160" />
          <line x1="52" y1="130" x2="62" y2="160" />
          <line x1="85" y1="105" x2="82" y2="162" />
          <line x1="100" y1="90" x2="102" y2="162" />
          <line x1="52" y1="130" x2="85" y2="105" />
        </g>
        
        <polygon points="100,55 135,45 115,75" fill="#DE851F" opacity="0.15" />
        <polygon points="80,65 65,90 85,105" fill="#DE851F" opacity="0.1" />
        <polygon points="135,45 155,60 125,105" fill="#1D9ED5" opacity="0.1" />
        
        <circle cx="100" cy="55" r="3.5" fill="#DE851F" />
        <circle cx="135" cy="45" r="3" fill="#1D9ED5" />
        <circle cx="115" cy="75" r="2.5" fill="#DE851F" />
        <circle cx="80" cy="65" r="3" fill="#DE851F" />
        <circle cx="65" cy="90" r="3.5" fill="#DE851F" />
        <circle cx="85" cy="105" r="3" fill="#DE851F" />
        <circle cx="100" cy="90" r="2.5" fill="#1D9ED5" />
        <circle cx="55" cy="75" r="3" fill="#DE851F" />
        <circle cx="45" cy="95" r="3" fill="#DE851F" />
        <circle cx="52" cy="130" r="3.5" fill="#DE851F" />
        <circle cx="155" cy="60" r="3.5" fill="#1D9ED5" />
        <circle cx="160" cy="85" r="3" fill="#1D9ED5" />
        <circle cx="145" cy="100" r="2.5" fill="#1D9ED5" />
        <circle cx="125" cy="105" r="3" fill="#1D9ED5" />
        <circle cx="148" cy="115" r="2" fill="#1D9ED5" />
        <circle cx="48" cy="160" r="3" fill="#DE851F" />
        <circle cx="62" cy="160" r="3" fill="#DE851F" />
        <circle cx="82" cy="162" r="3" fill="#1D9ED5" />
        <circle cx="102" cy="162" r="3.5" fill="#1D9ED5" />
      </svg>
      
      <!-- Typography -->
      <div style="display: flex; flex-direction: column; justify-content: center; line-height: 1;">
        <div style="display: flex; align-items: baseline;">
          <span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 18px; color: #DE851F; text-transform: uppercase; letter-spacing: 0.5px;">Ivoire</span>
          <span style="font-family: Arial, sans-serif; font-weight: 800; font-size: 18px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 2px;">Soft</span>
        </div>
        <span style="font-family: monospace; font-weight: bold; font-size: 8px; color: #1D9ED5; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 3px;">Solutions Numériques</span>
      </div>
    </div>
  `;
}
