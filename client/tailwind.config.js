/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: { bg: "var(--bg)", surface: "var(--surface)", "surface-clay": "var(--surface-clay)", "surface-alt": "var(--surface-alt)", border: "var(--border)", accent: "var(--accent)", "accent-dark": "var(--accent-dark)", "accent-light": "var(--accent-light)", primary: "var(--text-primary)", muted: "var(--text-muted)", high: "var(--severity-high)", medium: "var(--severity-med)", low: "var(--severity-low)" },
    borderRadius: { card: "var(--radius)", control: "16px" }, boxShadow: { glass: "8px 8px 16px var(--clay-shadow-dark), -8px -8px 16px var(--clay-shadow-light)", glow: "0 0 24px var(--accent-glow)" }, fontFamily: { sans: ["Inter", "sans-serif"] }
  } }, plugins: []
};
