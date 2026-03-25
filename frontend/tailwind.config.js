/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        night: {
          950: "#060b18",
          900: "#0d1324",
          875: "#10182a",
          850: "#121a2d",
          800: "#172033",
          700: "#24314c",
        },
        accent: {
          blue: "#3B82F6",
          green: "#22C55E",
          amber: "#F59E0B",
          rose: "#F43F5E",
          cyan: "#06B6D4",
          violet: "#8B5CF6",
        },
      },
      boxShadow: {
        elevation:
          "0 28px 80px rgba(15, 15, 15, 0.08), 0 8px 24px rgba(15, 15, 15, 0.05)",
        floating:
          "0 30px 90px rgba(0, 0, 0, 0.12), 0 14px 32px rgba(0, 0, 0, 0.08)",
        "inner-glow":
          "inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.03)",
      },
      backgroundImage: {
        "dashboard-sheen":
          "radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%), radial-gradient(circle at top right, rgba(244, 63, 94, 0.1), transparent 24%), linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 244, 240, 0.98))",
        "dashboard-grid":
          "linear-gradient(rgba(15, 15, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 15, 15, 0.05) 1px, transparent 1px)",
        "aurora-panel":
          "radial-gradient(circle at 18% 18%, rgba(59, 130, 246, 0.35), transparent 30%), radial-gradient(circle at 86% 10%, rgba(244, 63, 94, 0.25), transparent 28%), linear-gradient(160deg, rgba(12, 12, 12, 0.98), rgba(34, 34, 34, 0.98))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s ease-out",
        float: "float 5s ease-in-out infinite",
        glow: "glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
