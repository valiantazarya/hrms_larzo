import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import id from './locales/id.json';

// Get saved language from localStorage or default to 'id'
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('i18nextLng');
  if (saved && (saved === 'en' || saved === 'id')) {
    return saved;
  }
  return 'id'; // Default to Bahasa Indonesia
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language to localStorage when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;


