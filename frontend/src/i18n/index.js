import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Multi-language UI scaffold — add more locale blocks as needed and switch
// via i18n.changeLanguage('hi') etc. Wire the user's `locale` (from /auth/me)
// as the default on app bootstrap.
const resources = {
  en: { translation: {
    start_challenge: 'Start Challenge',
    leaderboard: 'Leaderboard',
    submit: 'Submit Solution',
    time_mode: 'Choose your time mode',
  } },
  hi: { translation: {
    start_challenge: 'चुनौती शुरू करें',
    leaderboard: 'लीडरबोर्ड',
    submit: 'समाधान सबमिट करें',
    time_mode: 'अपना टाइम मोड चुनें',
  } },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
