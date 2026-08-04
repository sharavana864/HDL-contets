import React from 'react';

export function RitLogo({ height = 52 }) {
  // Exact aspect ratio based on official RIT logo image (~2.85:1)
  const width = Math.round(height * 2.85);
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: `${height}px`,
      background: '#ffffff',
      padding: '4px 8px',
      borderRadius: '6px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
      userSelect: 'none'
    }}>
      <svg height={height - 6} viewBox="0 0 395 138" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        {/* Left Circuit Tree Blue Circle Emblem */}
        <g id="rit-tree-emblem">
          <circle cx="44" cy="42" r="38" fill="#1b4d89" />

          {/* Polygon facets at bottom */}
          <polygon points="12,55 30,42 44,52 18,72" fill="#153b6b" opacity="0.9" />
          <polygon points="30,42 44,52 60,38 76,55 70,72 18,72" fill="#1e589c" opacity="0.8" />
          <polygon points="44,52 60,38 78,48 70,72" fill="#2d71b8" opacity="0.9" />

          {/* Circuit Trunk & Branches */}
          <path d="M 44 72 V 22" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 44 54 L 28 38 M 44 46 L 60 30 M 44 38 L 22 22 M 44 30 L 64 16 M 44 24 L 32 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* Circuit Node Endpoints (Orange/Peach) */}
          <circle cx="28" cy="38" r="4" fill="#f26522" stroke="#ffffff" strokeWidth="1" />
          <circle cx="60" cy="30" r="4.5" fill="#f26522" stroke="#ffffff" strokeWidth="1" />
          <circle cx="22" cy="22" r="4" fill="#f26522" stroke="#ffffff" strokeWidth="1" />
          <circle cx="64" cy="16" r="4.5" fill="#f26522" stroke="#ffffff" strokeWidth="1" />
          <circle cx="32" cy="12" r="3.5" fill="#f26522" stroke="#ffffff" strokeWidth="1" />
          <circle cx="44" cy="18" r="5" fill="#f26522" stroke="#ffffff" strokeWidth="1.2" />
        </g>

        {/* Lowercase Heavy 'rit' */}
        <text x="94" y="62" fontFamily="'Arial Black', 'Inter', sans-serif" fontWeight="900" fontSize="58" fill="#111111" letterSpacing="-2.5">rit</text>
        {/* Official Orange Dot above 'i' */}
        <circle cx="141" cy="21" r="8" fill="#f26522" />

        {/* Thin Vertical Divider */}
        <line x1="166" y1="8" x2="166" y2="74" stroke="#f26522" strokeWidth="2" strokeLinecap="round" />

        {/* Text Block Right */}
        <text x="178" y="27" fontFamily="'Montserrat', 'Arial Black', sans-serif" fontWeight="900" fontSize="21" fill="#111111" letterSpacing="0.8">RAJALAKSHMI</text>
        <text x="178" y="48" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="800" fontSize="15" fill="#111111" letterSpacing="2.2">INSTITUTE OF</text>
        <text x="178" y="68" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="800" fontSize="15" fill="#111111" letterSpacing="2.2">TECHNOLOGY</text>

        {/* Full-width Slogan below */}
        <text x="12" y="104" fontFamily="'Montserrat', 'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#111111" letterSpacing="1.8">BELIEVE IN THE POSSIBILITIES</text>
        <text x="198" y="126" textAnchor="middle" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="800" fontSize="12" fill="#222222" letterSpacing="0.6">(AN AUTONOMOUS INSTITUTION)</text>
      </svg>
    </div>
  );
}

export function IeiLogo({ height = 52 }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: `${height}px`,
      background: '#ffffff',
      padding: '4px 8px',
      borderRadius: '6px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
      userSelect: 'none'
    }}>
      <svg height={height - 6} viewBox="0 0 310 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        {/* IEI Official Royal Charter Seal */}
        <g id="iei-seal-graphic">
          <circle cx="50" cy="50" r="46" stroke="#001f80" strokeWidth="2.5" fill="#ffffff" />
          <circle cx="50" cy="50" r="42" stroke="#001f80" strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="50" r="33" stroke="#001f80" strokeWidth="1.5" fill="#ffffff" />

          {/* Rope Cable Pattern Ring */}
          <circle cx="50" cy="50" r="37.5" stroke="#001f80" strokeWidth="7" strokeDasharray="2 3" opacity="0.3" fill="none" />

          {/* Arc Text Top */}
          <path id="ieiTopArc" d="M 14 50 A 36 36 0 0 1 86 50" fill="none" />
          <text fontSize="5.8" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="bold" fill="#001f80">
            <textPath href="#ieiTopArc" startOffset="50%" textAnchor="middle">THE INSTITUTION OF ENGINEERS (INDIA)</textPath>
          </text>

          {/* Arc Text Bottom */}
          <path id="ieiBottomArc" d="M 86 50 A 36 36 0 0 1 14 50" fill="none" />
          <text fontSize="4.6" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="bold" fill="#001f80">
            <textPath href="#ieiBottomArc" startOffset="50%" textAnchor="middle">INCORPORATED BY ROYAL CHARTER 1935</textPath>
          </text>

          {/* Established Text */}
          <text x="50" y="78" textAnchor="middle" fontFamily="'Georgia', serif" fontWeight="bold" fontSize="4.2" fill="#001f80">ESTABLISHED 1920</text>

          {/* Central Artisan Engineer Illustration */}
          <g transform="translate(50, 48)">
            {/* Background gear & ship */}
            <circle cx="0" cy="0" r="16" fill="none" stroke="#001f80" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
            <path d="M -12,8 L -6,-10 L 6,-10 L 12,8 Z" fill="none" stroke="#001f80" strokeWidth="1" />
            
            {/* Craftsman figure sitting */}
            <circle cx="0" cy="-10" r="3.5" fill="#001f80" />
            <path d="M -3,-6 C -6,2 -8,10 -3,14 L 4,14 C 8,10 6,2 3,-6 Z" fill="#001f80" />
            
            {/* Gear wheel & anvil at base */}
            <circle cx="-8" cy="8" r="5" stroke="#001f80" strokeWidth="1.5" fill="#ffffff" />
            <rect x="5" y="6" width="7" height="4" fill="#001f80" />
          </g>
        </g>

        {/* Official IEI Text Stack */}
        <g transform="translate(108, 16)">
          <text x="0" y="16" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="700" fontSize="19" fill="#001f80" letterSpacing="0.2">THE</text>
          <text x="0" y="36" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="800" fontSize="21" fill="#001f80" letterSpacing="0.2">INSTITUTION</text>
          <text x="0" y="55" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="700" fontSize="19" fill="#001f80" letterSpacing="0.2">OF ENGINEERS</text>
          <text x="0" y="74" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="800" fontSize="19" fill="#001f80" letterSpacing="0.2">(INDIA)</text>
        </g>
      </svg>
    </div>
  );
}

export function C3Logo({ height = 48, showSubtitle = true }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', position: 'relative' }}>
        <svg height={height} viewBox="0 0 140 70" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="c3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <filter id="c3Glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Speed motion lines */}
          <line x1="5" y1="20" x2="25" y2="20" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <line x1="2" y1="35" x2="30" y2="35" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <line x1="8" y1="50" x2="22" y2="50" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          
          {/* Main Angular C */}
          <path d="M 85 15 L 48 15 L 35 35 L 48 55 L 85 55 L 75 44 L 54 44 L 46 35 L 54 26 L 75 26 Z" fill="url(#c3Grad)" filter="url(#c3Glow)" stroke="#60a5fa" strokeWidth="1.5" />
          
          {/* Tech Grid details inside C */}
          <path d="M 40 28 L 50 20 M 48 42 L 58 50 M 60 18 L 70 24" stroke="#93c5fd" strokeWidth="1" opacity="0.7" />

          {/* Superscript 3 */}
          <text x="88" y="32" fontFamily="'Fira Code', monospace, sans-serif" fontWeight="900" fontSize="28" fill="#ffffff" filter="url(#c3Glow)">3</text>
          <text x="88" y="32" fontFamily="'Fira Code', monospace, sans-serif" fontWeight="900" fontSize="28" fill="#38bdf8">3</text>
        </svg>
      </div>
      {showSubtitle && (
        <div style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.08em', color: '#93c5fd', textTransform: 'uppercase', marginTop: '-4px', textShadow: '0 0 10px rgba(56,189,248,0.5)' }}>
          Code <span style={{ color: '#38bdf8' }}>•</span> Compile <span style={{ color: '#38bdf8' }}>•</span> Conquer
        </div>
      )}
    </div>
  );
}

export function TopHeaderLogos({ height = 42 }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '0.5rem 1.25rem',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(11, 15, 25, 0.9) 100%)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <RitLogo height={height} />
        <IeiLogo height={height} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <C3Logo height={height + 4} showSubtitle={true} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#38bdf8',
          background: 'rgba(56, 189, 248, 0.1)',
          padding: '0.35rem 0.75rem',
          borderRadius: '20px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          letterSpacing: '0.05em'
        }}>
          RIT & IEI HDL ARENA
        </div>
      </div>
    </div>
  );
}
