/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brutal: {
          black: '#000000',
          white: '#ffffff',
          gray: {
            dark: '#1a1a1a',
            light: '#e5e5e5',
          },
          red: '#ff0000',
          blue: '#0000ff',
          green: '#00ff00',
          yellow: '#ffff00',
          cyan: '#00ffff',
          magenta: '#ff00ff',
          orange: '#ff6600',
          pink: '#ff3399',
          purple: '#9900ff',
        },
        // Shadcn UI colors (HSL CSS variable based)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderWidth: {
        '3': '3px',
        '6': '6px',
        '8': '8px',
      },
      borderRadius: {
        'none': '0',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0 #000000',
        'brutal': '4px 4px 0 #000000',
        'brutal-md': '6px 6px 0 #000000',
        'brutal-lg': '8px 8px 0 #000000',
        'brutal-xl': '10px 10px 0 #000000',
        'brutal-red': '6px 6px 0 #ff0000',
        'brutal-yellow': '6px 6px 0 #ffff00',
        'brutal-inset': 'inset 4px 4px 0 #000000',
      },
      fontFamily: {
        'brutal': ['Arial', 'Helvetica', 'sans-serif'],
        'mono': ['Courier New', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
