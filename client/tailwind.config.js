/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: { bg: "var(--bg)", surface: "var(--surface)", "surface-alt": "var(--surface-alt)", border: "var(--border)", accent: "var(--accent)", "accent-dark": "var(--accent-dark)", primary: "var(--text-primary)", muted: "var(--text-muted)", high: "var(--severity-high)", medium: "var(--severity-med)", low: "var(--severity-low)" },
    borderRadius: { card: "var(--radius)", control: "10px" }, boxShadow: { glass: "0 8px 32px rgba(20,199,180,.12)", glow: "0 0 24px var(--accent-glow)" }, fontFamily: { sans: ["Inter", "sans-serif"] }
  } }, plugins: []
};
