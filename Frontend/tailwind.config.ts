import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";

export default {
	darkMode: ["class"],
	future: {
		hoverOnlyWhenSupported: true,
	},
	content: [
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ["Lato", "Open Sans", "Inter", "system-ui", "sans-serif"],
				academic: ['Source Sans Pro', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					dark: 'hsl(var(--primary-dark))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				/* IIPC Academic Colors */
				navy: {
					DEFAULT: 'hsl(var(--navy))',
					light: 'hsl(var(--navy-light))',
					foreground: 'hsl(var(--navy-foreground))'
				},
				'research-green': {
					DEFAULT: 'hsl(var(--research-green))',
					light: 'hsl(var(--research-green-light))',
					foreground: 'hsl(var(--research-green-foreground))'
				},
				slate: {
					DEFAULT: 'hsl(var(--slate))',
					light: 'hsl(var(--slate-light))',
					dark: 'hsl(var(--slate-dark))'
				},
				chat: {
					user: 'hsl(var(--chat-user))',
					assistant: 'hsl(var(--chat-assistant))',
					system: 'hsl(var(--chat-system))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))',
					bg: 'hsl(var(--sidebar-bg))',
					hover: 'hsl(var(--sidebar-hover))',
					active: 'hsl(var(--sidebar-active))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				'iipc-red': {
					DEFAULT: 'hsl(var(--iipc-red))',
				},
				'iipc-orange': {
					DEFAULT: 'hsl(var(--iipc-red))',
					dark: 'hsl(var(--primary-dark))',
				},
				'iipc-green': {
					DEFAULT: 'hsl(var(--iipc-green))',
					light: 'hsl(var(--navy-light))',
				},
				'iipc-darkgreen': {
					DEFAULT: 'hsl(var(--iipc-darkgreen))',
				},
				'iipc-teal': {
					DEFAULT: 'hsl(var(--iipc-teal))',
				},
				'iipc-gray': {
					DEFAULT: 'hsl(var(--iipc-gray))',
				},
			},
			boxShadow: {
				'soft': '0 2px 8px hsl(var(--shadow-soft))',
				'medium': '0 4px 16px hsl(var(--shadow-medium))',
				'strong': '0 8px 32px hsl(var(--shadow-strong))',
				'chat': '0 2px 12px hsl(var(--shadow-soft))',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate, tailwindcssTypography],
} satisfies Config;
