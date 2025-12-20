/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // STYLEGUIDE.md color system
        primary: '#111111',
        secondary: '#6A6A6A',
        tertiary: '#9A9A9A',
        'divider-strong': '#CCCCCC',
        'divider-subtle': '#E6E7EB',
        background: '#FFFFFF',
        // Action colors
        claimable: '#16a34a',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        // STYLEGUIDE.md type scale
        'title': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'heading': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['13px', { lineHeight: '1.5' }],
        'meta': ['12px', { lineHeight: '1.4' }],
        'table-header': ['11px', { lineHeight: '1.3', letterSpacing: '0.05em' }],
        'data': ['12px', { lineHeight: '1.4' }],
      },
      spacing: {
        // 4px-based scale
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
      },
      maxWidth: {
        'content': '860px',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}
