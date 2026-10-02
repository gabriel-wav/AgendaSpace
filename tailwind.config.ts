import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "1.5rem",
			screens: {
				"2xl": "1280px",
			},
		},
		extend: {
			// ─── Typography ──────────────────────────────────────────
			fontFamily: {
				sans: [
					"Inter",
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					'"Segoe UI"',
					"sans-serif",
				],
				mono: [
					'"JetBrains Mono"',
					'"Fira Code"',
					"ui-monospace",
					"monospace",
				],
			},
			fontSize: {
				"2xs": ["0.625rem", { lineHeight: "0.875rem" }],
				xs:   ["0.75rem",  { lineHeight: "1rem" }],
				sm:   ["0.8125rem",{ lineHeight: "1.25rem" }],  // 13px — Linear's base size
				base: ["0.875rem", { lineHeight: "1.5rem" }],   // 14px
				lg:   ["1rem",     { lineHeight: "1.625rem" }],
				xl:   ["1.125rem", { lineHeight: "1.75rem" }],
				"2xl":["1.25rem",  { lineHeight: "1.875rem" }],
				"3xl":["1.5rem",   { lineHeight: "2rem" }],
				"4xl":["1.875rem", { lineHeight: "2.25rem" }],
				"5xl":["2.25rem",  { lineHeight: "2.5rem", letterSpacing: "-0.03em" }],
			},

			// ─── Color Tokens (wired to CSS variables) ───────────────
			colors: {
				border:     "hsl(var(--border))",
				input:      "hsl(var(--input))",
				ring:       "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT:    "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
					light:      "hsl(var(--primary-light))",
					dark:       "hsl(var(--primary-dark))",
				},
				secondary: {
					DEFAULT:    "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
					light:      "hsl(var(--secondary-light))",
				},
				success: {
					DEFAULT:    "hsl(var(--success))",
					foreground: "hsl(var(--success-foreground))",
					light:      "hsl(var(--success-light))",
				},
				warning: {
					DEFAULT:    "hsl(var(--warning))",
					foreground: "hsl(var(--warning-foreground))",
					light:      "hsl(var(--warning-light))",
				},
				error: {
					DEFAULT:    "hsl(var(--error))",
					foreground: "hsl(var(--error-foreground))",
					light:      "hsl(var(--error-light))",
				},
				destructive: {
					DEFAULT:    "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT:    "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT:    "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT:    "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT:    "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				sidebar: {
					DEFAULT:              "hsl(var(--sidebar-background))",
					foreground:           "hsl(var(--sidebar-foreground))",
					primary:              "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent:               "hsl(var(--sidebar-accent))",
					"accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
					border:               "hsl(var(--sidebar-border))",
					ring:                 "hsl(var(--sidebar-ring))",
				},
			},

			// ─── Border Radius ────────────────────────────────────────
			// Sharp, precise. Not bubbly.
			borderRadius: {
				sm:  "4px",
				md:  "6px",                 // default component radius
				lg:  "8px",                 // larger panels
				xl:  "10px",
				"2xl": "12px",
				full: "9999px",
			},

			// ─── Spacing / Sizing ─────────────────────────────────────
			spacing: {
				px:   "1px",
				0:    "0px",
				0.5:  "2px",
				1:    "4px",
				1.5:  "6px",
				2:    "8px",
				2.5:  "10px",
				3:    "12px",
				3.5:  "14px",
				4:    "16px",
				5:    "20px",
				6:    "24px",
				7:    "28px",
				8:    "32px",
				9:    "36px",
				10:   "40px",
				11:   "44px",
				12:   "48px",
				14:   "56px",
				16:   "64px",
				18:   "72px",
				20:   "80px",
				24:   "96px",
			},

			// ─── Shadows ──────────────────────────────────────────────
			// Premium: subtle elevation, never heavy
			boxShadow: {
				none: "none",
				sm:   "0 1px 2px 0 rgb(0 0 0 / 0.04)",
				md:   "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
				lg:   "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
				// Outline variant — for popovers/dropdowns
				"outline-sm":    "0 0 0 1px hsl(var(--border))",
				"outline-focus": "0 0 0 2px hsl(var(--ring))",
			},

			// ─── Animation ────────────────────────────────────────────
			// All transitions match a single cubic-bezier for consistency
			transitionTimingFunction: {
				"out-expo":  "cubic-bezier(0.16, 1, 0.3, 1)",
				"in-out-sm": "cubic-bezier(0.4, 0, 0.2, 1)",
			},
			transitionDuration: {
				DEFAULT: "150ms",
				fast:    "100ms",
				slow:    "250ms",
			},

			keyframes: {
				// Shadcn Accordion
				"accordion-down": {
					from: { height: "0", opacity: "0" },
					to:   { height: "var(--radix-accordion-content-height)", opacity: "1" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
					to:   { height: "0", opacity: "0" },
				},
				// Micro-interactions
				"fade-in": {
					from: { opacity: "0" },
					to:   { opacity: "1" },
				},
				"fade-in-up": {
					from: { opacity: "0", transform: "translateY(4px)" },
					to:   { opacity: "1", transform: "translateY(0)" },
				},
				"fade-in-down": {
					from: { opacity: "0", transform: "translateY(-4px)" },
					to:   { opacity: "1", transform: "translateY(0)" },
				},
				"slide-in-right": {
					from: { opacity: "0", transform: "translateX(8px)" },
					to:   { opacity: "1", transform: "translateX(0)" },
				},
				"scale-in": {
					from: { opacity: "0", transform: "scale(0.97)" },
					to:   { opacity: "1", transform: "scale(1)" },
				},
				// Pulse dot for live indicators
				"pulse-dot": {
					"0%, 100%": { opacity: "1" },
					"50%":      { opacity: "0.4" },
				},
			},

			animation: {
				"accordion-down":  "accordion-down 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
				"accordion-up":    "accordion-up 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
				"fade-in":         "fade-in 0.15s ease-out",
				"fade-in-up":      "fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
				"fade-in-down":    "fade-in-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
				"slide-in-right":  "slide-in-right 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
				"scale-in":        "scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
				"pulse-dot":       "pulse-dot 2s ease-in-out infinite",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
