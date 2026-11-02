export type Language = "en" | "ta";

export const languageLabels: Record<Language, string> = {
  en: "English",
  ta: "தமிழ்",
};

const translations = {
  en: {
    brand: "MoviesHub",
    tagline: "Your world of cinema",
    home: "Home",
    movies: "Movies",
    dashboard: "Dashboard",
    assistant: "AI Picks",
    admin: "Admin",
    login: "Login",
  },
  ta: {
    brand: "MoviesHub",
    tagline: "உங்கள் சினிமா உலகம்",
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
