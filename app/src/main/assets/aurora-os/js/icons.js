/* =========================================================
   Icons — small library of original Fluent-style SVG icons.
   Each function returns a self-contained <svg> string sized
   to fill its container (width/height 100%), so callers can
   control final size purely through CSS on the wrapper.
   ========================================================= */
const Icons = {
  explorer: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <defs>
        <linearGradient id="fx1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFD54F"/><stop offset="1" stop-color="#FFB300"/>
        </linearGradient>
        <linearGradient id="fx2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFE082"/><stop offset="1" stop-color="#FFCA43"/>
        </linearGradient>
      </defs>
      <path d="M5 14a3 3 0 0 1 3-3h9l4 4h17a3 3 0 0 1 3 3v3H5v-7Z" fill="url(#fx1)"/>
      <path d="M4 19a2 2 0 0 1 2-2h36a2 2 0 0 1 2 2l-2.4 16.6A3 3 0 0 1 38.6 38H9.4a3 3 0 0 1-2.97-2.4L4 19Z" fill="url(#fx2)"/>
    </svg>`,

  browser: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <defs>
        <linearGradient id="bwA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#38C6FF"/><stop offset="1" stop-color="#0A5FCC"/>
        </linearGradient>
        <linearGradient id="bwB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#41E296"/><stop offset="1" stop-color="#0BA45A"/>
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#bwA)"/>
      <path d="M24 4a20 20 0 0 1 17.3 30L24 24 12 8.6A19.9 19.9 0 0 1 24 4Z" fill="url(#bwB)" opacity=".85"/>
      <circle cx="24" cy="24" r="8" fill="#fff"/>
      <circle cx="24" cy="24" r="5" fill="#0A5FCC"/>
    </svg>`,

  terminal: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <rect x="4" y="8" width="40" height="32" rx="6" fill="#1B1B1F"/>
      <rect x="4" y="8" width="40" height="32" rx="6" fill="#2B2B33" opacity=".4"/>
      <path d="M11 18l8 6-8 6" stroke="#5FE0A5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M23 30h11" stroke="#5FE0A5" stroke-width="3" stroke-linecap="round"/>
    </svg>`,

  notepad: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <defs>
        <linearGradient id="npA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5FA8FF"/><stop offset="1" stop-color="#0F63D6"/>
        </linearGradient>
      </defs>
      <rect x="8" y="4" width="32" height="40" rx="3" fill="#fff"/>
      <rect x="8" y="4" width="32" height="9" rx="3" fill="url(#npA)"/>
      <rect x="14" y="20" width="20" height="2.6" rx="1.3" fill="#C6D3E3"/>
      <rect x="14" y="26" width="20" height="2.6" rx="1.3" fill="#C6D3E3"/>
      <rect x="14" y="32" width="13" height="2.6" rx="1.3" fill="#C6D3E3"/>
    </svg>`,

  paint: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d="M24 6C13 6 5 14 5 24c0 8 5 13 11 13 2.6 0 4-1.4 4-3.4 0-1.7-1.4-2.2-1.4-4 0-1.6 1.3-2.6 3-2.6h4.6C33.7 27 40 21.6 40 15.4 40 9.8 33 6 24 6Z" fill="#F4F4F4"/>
      <circle cx="14" cy="20" r="3.4" fill="#3AA0FF"/>
      <circle cx="16" cy="29" r="3.4" fill="#FF5C5C"/>
      <circle cx="24" cy="14" r="3.4" fill="#FFC93C"/>
      <circle cx="32" cy="18" r="3.4" fill="#38C976"/>
      <circle cx="33" cy="27" r="3.4" fill="#B36CFF"/>
    </svg>`,

  calculator: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <rect x="8" y="4" width="32" height="40" rx="5" fill="#1D6FE0"/>
      <rect x="13" y="9" width="22" height="9" rx="2" fill="#EAF2FF"/>
      <g fill="#EAF2FF">
        <rect x="13" y="23" width="6" height="6" rx="1.4"/><rect x="21" y="23" width="6" height="6" rx="1.4"/><rect x="29" y="23" width="6" height="6" rx="1.4"/>
        <rect x="13" y="32" width="6" height="6" rx="1.4"/><rect x="21" y="32" width="6" height="6" rx="1.4"/>
      </g>
      <rect x="29" y="32" width="6" height="6" rx="1.4" fill="#8FC1FF"/>
    </svg>`,

  settings: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <circle cx="24" cy="24" r="6.5" fill="none" stroke="#8B93A6" stroke-width="4.4"/>
      <path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5 37 37M37 11l-3.5 3.5M14.5 33.5 11 37"
        stroke="#8B93A6" stroke-width="4.4" stroke-linecap="round"/>
    </svg>`,

  recyclebin: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d="M14 12V9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3" fill="none" stroke="#8B93A6" stroke-width="3"/>
      <rect x="9" y="12" width="30" height="4" rx="2" fill="#A6ADBD"/>
      <path d="M12 17h24l-2.2 24.3A3 3 0 0 1 30.8 44H17.2a3 3 0 0 1-3-2.7L12 17Z" fill="#C8CEDB"/>
      <rect x="19" y="21" width="3" height="17" rx="1.5" fill="#7C8394"/>
      <rect x="26" y="21" width="3" height="17" rx="1.5" fill="#7C8394"/>
    </svg>`,

  clock: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <circle cx="24" cy="24" r="19" fill="#EAF2FF"/>
      <circle cx="24" cy="24" r="19" fill="none" stroke="#1D6FE0" stroke-width="2.4"/>
      <path d="M24 13v11l8 5" fill="none" stroke="#1D6FE0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  photos: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <rect x="6" y="10" width="24" height="24" rx="4" fill="#FF5C8A"/>
      <rect x="18" y="14" width="24" height="24" rx="4" fill="#3AA0FF"/>
      <circle cx="26" cy="22" r="3" fill="#fff"/>
      <path d="M18 34l6-7 5 5 4-4.5 9 10.5H18Z" fill="#fff" opacity=".9"/>
    </svg>`,

  minesweeper: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <rect x="5" y="5" width="38" height="38" rx="5" fill="#BFC7D6"/>
      <rect x="9" y="9" width="30" height="30" rx="3" fill="#E4E9F2"/>
      <circle cx="24" cy="24" r="9" fill="#2B2B33"/>
      <g stroke="#2B2B33" stroke-width="2.4" stroke-linecap="round">
        <path d="M24 9v4M24 35v4M9 24h4M35 24h4M14 14l3 3M31 31l3 3M34 14l-3 3M17 31l-3 3"/>
      </g>
      <circle cx="21" cy="21" r="2" fill="#fff" opacity=".8"/>
    </svg>`,

  game2048: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <rect x="4" y="4" width="40" height="40" rx="6" fill="#E3D5C0"/>
      <rect x="9" y="9" width="13" height="13" rx="3" fill="#F2B179"/>
      <rect x="26" y="9" width="13" height="13" rx="3" fill="#F59563"/>
      <rect x="9" y="26" width="13" height="13" rx="3" fill="#EDC850"/>
      <rect x="26" y="26" width="13" height="13" rx="3" fill="#EDCC61"/>
      <text x="15.5" y="19.5" font-family="Segoe UI, sans-serif" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">2</text>
      <text x="32.5" y="19.5" font-family="Segoe UI, sans-serif" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">4</text>
      <text x="15.5" y="36.5" font-family="Segoe UI, sans-serif" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">8</text>
      <text x="32.5" y="36.5" font-family="Segoe UI, sans-serif" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">16</text>
    </svg>`,

  snake: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <rect x="4" y="4" width="40" height="40" rx="6" fill="#173B2B"/>
      <path d="M12 30c0-6 6-4 6-10s-6-4-6-9" fill="none" stroke="#4ADE80" stroke-width="4.4" stroke-linecap="round"/>
      <circle cx="12" cy="11" r="2.6" fill="#4ADE80"/>
      <rect x="30" y="28" width="6" height="6" rx="1.4" fill="#FF6B6B"/>
    </svg>`,

  about: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <circle cx="24" cy="24" r="19" fill="#1D6FE0"/>
      <circle cx="24" cy="15" r="2.6" fill="#fff"/>
      <rect x="21.5" y="21" width="5" height="14" rx="2" fill="#fff"/>
    </svg>`,

  folder: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d="M5 14a3 3 0 0 1 3-3h9l4 4h17a3 3 0 0 1 3 3v3H5v-7Z" fill="#FFC94B"/>
      <path d="M4 19a2 2 0 0 1 2-2h36a2 2 0 0 1 2 2l-2.4 16.6A3 3 0 0 1 38.6 38H9.4a3 3 0 0 1-2.97-2.4L4 19Z" fill="#FFB300"/>
    </svg>`,

  fileText: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d="M12 4h16l8 8v32H12V4Z" fill="#fff"/>
      <path d="M28 4l8 8h-8V4Z" fill="#C6D3E3"/>
      <rect x="16" y="20" width="16" height="2.2" rx="1.1" fill="#5FA8FF"/>
      <rect x="16" y="25" width="16" height="2.2" rx="1.1" fill="#C6D3E3"/>
      <rect x="16" y="30" width="10" height="2.2" rx="1.1" fill="#C6D3E3"/>
    </svg>`,

  fileImage: () => `
    <svg viewBox="0 0 48 48" width="100%" height="100%">
      <path d="M12 4h16l8 8v32H12V4Z" fill="#fff"/>
      <path d="M28 4l8 8h-8V4Z" fill="#C6D3E3"/>
      <rect x="16" y="20" width="16" height="12" rx="1.6" fill="#EAF2FF" stroke="#8FC1FF" stroke-width="1.4"/>
      <circle cx="20" cy="24" r="1.6" fill="#FFC93C"/>
      <path d="M17 31l4-4 3 3 4-5 4 6H17Z" fill="#3AA0FF"/>
    </svg>`,

  power: () => `
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      <path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
};
