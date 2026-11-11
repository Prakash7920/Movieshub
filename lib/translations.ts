export type Language = "en" | "ta";

export const languageLabels: Record<Language, string> = {
  en: "English",
  ta: "தமிழ்",
};

const translations = {
  en: {
    brand: "NexaFilm",
    tagline: "One Platform. Every Language.",
    home: "Home",
    movies: "Movies",
    dashboard: "Dashboard",
    assistant: "AI Picks",
    admin: "Admin",
    login: "Login",
  },
  ta: {
    brand: "NexaFilm",
    tagline: "ஒரே தளம். அனைத்து மொழிகளிலும்.",
    home: "முகப்பு",
    movies: "திரைப்படங்கள்",
    dashboard: "டாஷ்போர்டு",
    assistant: "AI பரிந்துரைகள்",
    admin: "நிர்வாகம்",
    login: "உள்நுழை",
  },
};

export function getTranslations(language: Language) {
  return translations[language];
}
