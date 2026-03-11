import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import siTranslation from './locales/si.json';
import taTranslation from './locales/ta.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  si: {
    translation: siTranslation,
  },
  ta: {
    translation: taTranslation,
  },
};

const savedLanguage = localStorage.getItem('appLanguage') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
