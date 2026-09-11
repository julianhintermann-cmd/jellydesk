import i18next, { type i18n as I18nextType } from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

export type AppLanguage = 'de' | 'en';

export const i18n: I18nextType = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, en: { translation: en } },
  lng: 'de',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function setLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}
