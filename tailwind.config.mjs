/** @type {import('tailwindcss').Config} */
// Design tokens from SPEC.md §2 — "Industrial Confidence".
// No arbitrary values in components; everything below is the palette.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1D21',
        steel: '#3D444D',
        surface: '#F5F4F1',
        safety: {
          DEFAULT: '#F2A900',
          hover: '#D99700',
        },
        rust: '#B0492F',
        success: '#2E7D4F',
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', 'ui-sans-serif', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // SPEC §2.2 scale
        h1: ['clamp(2rem, 5vw, 3.25rem)', { lineHeight: '1.05' }],
        h2: ['clamp(1.5rem, 3.5vw, 2.25rem)', { lineHeight: '1.1' }],
        h3: ['1.375rem', { lineHeight: '1.25' }],
        h4: ['1.125rem', { lineHeight: '1.3' }],
        body: ['1.0625rem', { lineHeight: '1.6' }],
        meta: ['0.875rem', { lineHeight: '1.5' }],
        nav: ['0.9375rem', { lineHeight: '1.4' }],
      },
      letterSpacing: {
        heading: '0.02em',
      },
      maxWidth: {
        content: '1200px',
        measure: '70ch',
      },
      borderColor: {
        card: 'rgba(61, 68, 77, 0.15)',
      },
      borderRadius: {
        card: '8px',
      },
      spacing: {
        // 4px base unit is Tailwind default; section padding helpers
        section: '4rem',
        'section-lg': '6rem',
      },
    },
  },
  plugins: [],
};
