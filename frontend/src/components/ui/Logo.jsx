/**
 * Official Andhra Pradesh Government & DSMS Sanitation Vehicle Logo:
 * Features:
 * - Sacred AP State Emblem: Poorna Kumbham (పూర్ణకుంభం) & Lotus Petal Sunburst Halo
 * - Municipal Sanitation & Waste Collection Compactor Vehicle with Eco-Leaf & Recycling Symbol
 * - Official Typography: "DSMS AP GOV • Government of Andhra Pradesh • West Godavari District"
 * - Multi-size presets: xs, sm, md, lg, xl, hero
 */
import React from 'react';

export default function Logo({ size = 'md', showText = true, textLight = false, animated = false }) {
  const sizeMap = {
    xs: { box: 'w-7 h-7', px: 28, titleSize: 'text-xs', subSize: 'text-[8px]' },
    sm: { box: 'w-9 h-9', px: 36, titleSize: 'text-sm', subSize: 'text-[9px]' },
    md: { box: 'w-11 h-11', px: 44, titleSize: 'text-base', subSize: 'text-[10px]' },
    lg: { box: 'w-14 h-14', px: 56, titleSize: 'text-lg', subSize: 'text-xs' },
    xl: { box: 'w-18 h-18', px: 72, titleSize: 'text-2xl', subSize: 'text-xs' },
    hero: { box: 'w-24 h-24', px: 96, titleSize: 'text-3xl', subSize: 'text-sm' },
  };

  const config = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Official AP Government & Sanitation Vehicle Emblem */}
      <div className={`relative ${config.box} flex-shrink-0 flex items-center justify-center`}>
        <svg
          width={config.px}
          height={config.px}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${animated ? 'animate-pulse' : ''} drop-shadow-md`}
        >
          <defs>
            {/* AP Royal Gold & Emerald Gradients */}
            <linearGradient id="apLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            <linearGradient id="apLogoEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            <linearGradient id="apTruckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="apSunburst" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* 1. Outer AP Sunburst Ring with 32 Solar Rays */}
          <circle cx="50" cy="50" r="48" fill="url(#apSunburst)" fillOpacity="0.2" />
          <circle cx="50" cy="50" r="46.5" stroke="url(#apLogoGold)" strokeWidth="2.2" />

          {/* Ornamental Pearl Beads on Outer Rim */}
          {[...Array(20)].map((_, i) => {
            const angle = (i * 360) / 20;
            const x = 50 + 44 * Math.cos((angle * Math.PI) / 180);
            const y = 50 + 44 * Math.sin((angle * Math.PI) / 180);
            return <circle key={i} cx={x} cy={y} r="1.4" fill="#fef08a" />;
          })}

          {/* 2. Inner Royal Emerald Circular Shield */}
          <circle cx="50" cy="50" r="41" fill="url(#apLogoEmerald)" stroke="url(#apLogoGold)" strokeWidth="1.6" />

          {/* Decorative Lotus Flower Petal Border */}
          {[...Array(14)].map((_, i) => {
            const angle = (i * 360) / 14;
            const x = 50 + 36 * Math.cos((angle * Math.PI) / 180);
            const y = 50 + 36 * Math.sin((angle * Math.PI) / 180);
            return <circle key={`petal-${i}`} cx={x} cy={y} r="2.2" fill="#34d399" fillOpacity="0.8" />;
          })}

          {/* 3. Top Crest: Poorna Kumbham (Sacred Kalash of Andhra Pradesh) */}
          <g id="ap-poorna-kumbham" transform="translate(0, -6)">
            {/* Coconut & Mango Foliage Crest */}
            <path d="M50 20C47 23 46 27 46 29H54C54 27 53 23 50 20Z" fill="url(#apLogoGold)" />
            <path d="M46 28C42 25 38 27 37 30C40 32 44 31 46 29Z" fill="#34d399" />
            <path d="M54 28C58 25 62 27 63 30C60 32 56 31 54 29Z" fill="#34d399" />
            {/* Kalash Body */}
            <ellipse cx="50" cy="30" rx="9" ry="2.5" fill="url(#apLogoGold)" stroke="#78350f" strokeWidth="0.6" />
            <path d="M42 30.5C40 35 38 39 38 45C38 52 43 55 50 55C57 55 62 52 62 45C62 39 60 35 58 30.5H42Z" fill="url(#apLogoGold)" stroke="#78350f" strokeWidth="0.8" />
            <path d="M40 43C43 47 57 47 60 43" stroke="#064e3b" strokeWidth="1.6" strokeLinecap="round" />
            {/* Ashoka Star Node */}
            <circle cx="50" cy="44" r="2.5" fill="#047857" stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* 4. Integrated Garbage Collection & Sanitation Truck */}
          <g id="sanitation-truck" transform="translate(0, 10)">
            {/* Truck Hydraulic Compactor Cargo Box */}
            <rect x="22" y="44" width="34" height="23" rx="4" fill="url(#apTruckGrad)" stroke="#064e3b" strokeWidth="1.2" />
            <line x1="22" y1="52" x2="56" y2="52" stroke="#065f46" strokeWidth="1.5" />
            
            {/* Bio-Leaf Decal on Compactor */}
            <circle cx="38" cy="52" r="6" fill="#ffffff" fillOpacity="0.25" />
            <path d="M38 48C35 48 33 51 33 54C33 57 36 59 38 59C40 59 43 57 43 54C43 51 41 48 38 48Z" fill="#ffffff" />
            <line x1="38" y1="50" x2="38" y2="57" stroke="#065f46" strokeWidth="1" />

            {/* Truck Driver Cabin */}
            <path d="M56 48H69L75 56V67H56V48Z" fill="#10b981" stroke="#064e3b" strokeWidth="1.2" />
            {/* Cabin Windshield */}
            <path d="M59 50H68L73 56H59V50Z" fill="#bae6fd" />
            {/* Headlight */}
            <circle cx="74" cy="61" r="2" fill="#fde047" />

            {/* Truck Wheels (Rubber Tires + Rims) */}
            <circle cx="31" cy="68" r="6.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="31" cy="68" r="2.5" fill="#facc15" />
            <circle cx="47" cy="68" r="6.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="47" cy="68" r="2.5" fill="#facc15" />
            <circle cx="67" cy="68" r="6.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="67" cy="68" r="2.5" fill="#facc15" />

            {/* Ground Asphalt Line */}
            <line x1="16" y1="75" x2="84" y2="75" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>
        </svg>
      </div>

      {/* Official Government & DSMS Typography */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-tight ${config.titleSize} ${
                textLight ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              DSMS
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm">
              AP GOV
            </span>
          </div>
          <span
            className={`font-bold tracking-tight truncate mt-0.5 ${config.subSize} ${
              textLight ? 'text-emerald-200' : 'text-emerald-800 dark:text-emerald-300'
            }`}
          >
            Government of Andhra Pradesh
          </span>
          <span
            className={`text-[9px] font-medium tracking-wide truncate ${
              textLight ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            West Godavari District • Cleanliness Fleet
          </span>
        </div>
      )}
    </div>
  );
}
