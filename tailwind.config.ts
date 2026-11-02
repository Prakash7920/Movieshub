module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        panel: "#111827",
        primary: "#dc2626",
        accent: "#d4af37",
        muted: "#9ca3af",
        card: "#171717"
      },
      boxShadow: {
        glow: "0 0 25px rgba(220, 38, 38, 0.25)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"]
      }
    }
  },
  plugins: []
};
