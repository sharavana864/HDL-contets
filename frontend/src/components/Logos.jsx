import React from 'react';

export function RitLogo({ height = 48 }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: `${height}px`,
      background: '#ffffff',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      gap: '0.5rem',
      userSelect: 'none'
    }}>
      <svg height={height - 10} viewBox="0 0 380 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Blue Circuit Tree Circle */}
        <g id="rit-badge">
          <circle cx="45" cy="45" r="42" fill="#1e40af" />
          <path d="M45 75 V 35 M45 60 L32 46 M45 52 L58 38 M45 44 L28 30 M45 38 L62 24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="46" r="4" fill="#f97316" />
          <circle cx="58" cy="38" r="4" fill="#f97316" />
          <circle cx="28" cy="30" r="4" fill="#f97316" />
          <circle cx="62" cy="24" r="4" fill="#f97316" />
          <circle cx="45" cy="22" r="5" fill="#f97316" />
          {/* Subtle circuit polygon mesh overlay */}
          <path d="M 12 45 L 28 30 L 45 22 L 62 24 L 78 45 L 60 70 L 30 70 Z" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" />
        </g>

        {/* Lowercase 'rit' */}
        <text x="96" y="60" fontFamily="'Inter', 'Arial Black', sans-serif" fontWeight="900" fontSize="56" fill="#0f172a" letterSpacing="-2">rit</text>
        {/* Orange dot for i */}
        <circle cx="140" cy="22" r="7" fill="#f97316" />

        {/* Orange/Peach Vertical Divider */}
        <line x1="168" y1="12" x2="168" y2="78" stroke="#f97316" strokeWidth="2.5" />

        {/* Right side text stack */}
        <text x="178" y="28" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="900" fontSize="18" fill="#000000" letterSpacing="0.5">RAJALAKSHMI</text>
        <text x="178" y="44" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="700" fontSize="14" fill="#1e293b" letterSpacing="0.8">INSTITUTE OF</text>
        <text x="178" y="60" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="700" fontSize="14" fill="#1e293b" letterSpacing="0.8">TECHNOLOGY</text>
        <text x="178" y="74" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="800" fontSize="10.5" fill="#0f172a" letterSpacing="0.2">BELIEVE IN THE POSSIBILITIES</text>
        <text x="178" y="86" fontFamily="'Montserrat', 'Arial', sans-serif" fontWeight="700" fontSize="8.5" fill="#334155" letterSpacing="0.1">(AN AUTONOMOUS INSTITUTION)</text>
      </svg>
    </div>
  );
}

export function IeiLogo({ height = 48 }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: `${height}px`,
      background: '#ffffff',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      gap: '0.5rem',
      userSelect: 'none'
    }}>
      <svg height={height - 10} viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* IEI Seal */}
        <g id="iei-seal">
          <circle cx="45" cy="45" r="41" stroke="#1e3a8a" strokeWidth="3" fill="#ffffff" />
          <circle cx="45" cy="45" r="36" stroke="#1e3a8a" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
          <circle cx="45" cy="45" r="28" stroke="#1e3a8a" strokeWidth="1" fill="#f8fafc" />
          
          {/* Circular Text */}
          <path id="ieiTextArcTop" d="M 12 45 A 33 33 0 0 1 78 45" fill="none" />
          <text fontSize="5.8" fontFamily="serif" fontWeight="bold" fill="#1e3a8a">
            <textPath href="#ieiTextArcTop" startOffset="50%" textAnchor="middle">THE INSTITUTION OF ENGINEERS (INDIA)</textPath>
          </text>
          
          {/* Emblem Center */}
          <path d="M 32 60 L 45 28 L 58 60 Z" fill="#1e3a8a" opacity="0.12" />
          <circle cx="45" cy="45" r="9" stroke="#1e3a8a" strokeWidth="2" fill="#ffffff" />
          <path d="M45 28 V 62 M30 52 H 60 M34 40 H 56" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" />
          <text x="45" y="74" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="4.5" fill="#1e3a8a">ESTD 1920</text>
        </g>

        {/* IEI Right Text Stack */}
        <g transform="translate(100, 14)">
          <text x="0" y="16" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="600" fontSize="18" fill="#1e3a8a">The</text>
          <text x="0" y="34" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="700" fontSize="20" fill="#1e3a8a">Institution</text>
          <text x="0" y="50" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="600" fontSize="18" fill="#1e3a8a">of Engineers</text>
          <text x="0" y="66" fontFamily="'Georgia', 'Times New Roman', serif" fontWeight="700" fontSize="18" fill="#1e3a8a">(India)</text>
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
