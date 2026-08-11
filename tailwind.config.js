/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#EDFAFA',100:'#D2F3F3',200:'#A6E7E8',300:'#6FD3D6',400:'#38B6BC',
          500:'#17989F',600:'#0E7C86',700:'#0D636C',800:'#0F4F57',900:'#114249',950:'#052A30',
          DEFAULT:'#0E7C86',
        },
        secondary: {
          50:'#F0F4FA',100:'#DCE5F3',200:'#BFCFE9',300:'#94AFDA',400:'#6288C6',
          500:'#3F6AB1',600:'#2E5295',700:'#274279',800:'#243A65',900:'#16244A',950:'#0B1430',
          DEFAULT:'#16244A',
        },
        accent: {
          50:'#FFF9EB',100:'#FEEFC7',200:'#FDDD8A',300:'#FCC64D',400:'#FBB024',
          500:'#F5920B',600:'#D96D06',700:'#B44B09',800:'#92390E',900:'#78300F',
          DEFAULT:'#F5920B',
        },
        success: { 50:'#ECFDF5',100:'#D1FAE5',500:'#10B981',600:'#059669',700:'#047857', DEFAULT:'#10B981' },
        warning: { 50:'#FFFBEB',100:'#FEF3C7',500:'#F59E0B',600:'#D97706',700:'#B45309', DEFAULT:'#F59E0B' },
        danger:  { 50:'#FFF1F2',100:'#FFE4E6',500:'#F43F5E',600:'#E11D48',700:'#BE123C', DEFAULT:'#F43F5E' },
        info:    { 50:'#F0F9FF',100:'#E0F2FE',500:'#0EA5E9',600:'#0284C7',700:'#0369A1', DEFAULT:'#0EA5E9' },

        // sale-status palette (matches CSS vars)
        status: {
          draft:'#94A3B8', submitted:'#0EA5E9', verified:'#8B5CF6', posted:'#10B981',
          returned:'#F59E0B', refunded:'#F43F5E', pending:'#F97316', cancelled:'#64748B',
        },

        // semantic surfaces via CSS variables (auto dark mode)
        bg:        'var(--bg)',
        subtle:    'var(--bg-subtle)',
        surface:   'var(--surface)',
        surface2:  'var(--surface-hover)',
        line:      'var(--border)',
        lineStrong:'var(--border-strong)',
        ink:       'var(--text-primary)',
        inkSoft:   'var(--text-secondary)',
        inkMuted:  'var(--text-muted)',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: { sm:'8px', md:'12px', lg:'16px', xl:'20px', '2xl':'24px' },
      boxShadow: {
        card:  '0 1px 2px rgba(11,29,38,.06)',
        md:    '0 4px 12px rgba(11,29,38,.08)',
        lg:    '0 12px 32px rgba(11,29,38,.12)',
        hover: '0 16px 40px rgba(14,124,134,.18)',
        'glow-primary':'0 0 0 3px rgba(23,152,159,.22)',
        'glow-accent':'0 0 0 3px rgba(245,146,11,.25)',
        'nav':'0 6px 18px rgba(14,124,134,.4)',
      },
      backgroundImage: {
        'grad-brand':  'linear-gradient(135deg,#0E7C86 0%,#17989F 45%,#38B6BC 100%)',
        'grad-navy':   'linear-gradient(160deg,#16244A 0%,#0B1430 100%)',
        'grad-sunset': 'linear-gradient(135deg,#F5920B 0%,#FBB024 60%,#FCC64D 100%)',
        'grad-horizon':'linear-gradient(120deg,#0B1430 0%,#16244A 35%,#0E7C86 100%)',
        'grad-success':'linear-gradient(135deg,#059669 0%,#10B981 100%)',
        'grad-warning':'linear-gradient(135deg,#D97706 0%,#F59E0B 100%)',
        'grad-danger': 'linear-gradient(135deg,#E11D48 0%,#F43F5E 100%)',
      },
      spacing: { sidebar:'264px', 'sidebar-sm':'76px', topbar:'68px' },
      transitionTimingFunction: {
        spring:'cubic-bezier(.34,1.56,.64,1)',
        smooth:'cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadeUp:  { from:{opacity:0, transform:'translateY(14px)'}, to:{opacity:1, transform:'none'} },
        scaleIn: { from:{opacity:0, transform:'scale(.96)'}, to:{opacity:1, transform:'scale(1)'} },
        shimmer: { from:{backgroundPosition:'-400px 0'}, to:{backgroundPosition:'400px 0'} },
      },
      animation: {
        'fade-up':'fadeUp .45s cubic-bezier(.16,1,.3,1) both',
        'scale-in':'scaleIn .3s cubic-bezier(.34,1.56,.64,1) both',
        shimmer:'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};