module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          purple: '#9333ea',
          dark: '#0a0a0a',
          darker: '#1a0a2e',
          darkest: '#16213e',
          blue: '#0f3460',
          light: '#e0e6ff',
          cyan: '#00e6e6',
          red: '#ff6666',
          brightRed: '#ff0000',
          accent: '#f7df1e',
        }
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        oxanium: ['Oxanium', 'sans-serif'],
        fira: ['Fira Code', 'monospace'],
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(147, 51, 234, 0.3)',
        'cyber-lg': '0 0 30px rgba(147, 51, 234, 0.4)',
        'cyber-xl': '0 0 40px rgba(147, 51, 234, 0.5)',
      },
      animation: {
        fadeInScale: 'fadeInScale 0.5s ease-out forwards',
        sparkAppear: 'sparkAppear 2s infinite',
        fadeMessage: 'fadeMessage 3s infinite'
      },
      keyframes: {
        fadeInScale: {
          from: { 
            opacity: '0',
            transform: 'scale(0.95)',
          },
          to: { 
            opacity: '1',
            transform: 'scale(1)',
          }
        },
        sparkAppear: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.75) rotate(0deg)',
          },
          '50%': { 
            opacity: '1',
            transform: 'scale(1.25) rotate(360deg)',
          },
          '100%': { 
            opacity: '0',
            transform: 'scale(1) rotate(720deg)',
          }
        },
        fadeMessage: {
          '0%': { 
            opacity: '0', 
          },
          '20%': { 
            opacity: '100', 
          },
          '80%': { 
            opacity: '100', 
          },
          '100%': { 
            opacity: '0', 
          }
        }
      }
    },
  },
  plugins: [],
}