import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

const LANGUAGE_KEY = '@app_language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (storedLang) {
        return callback(storedLang);
      }
      return callback('uz'); // default language
    } catch (error) {
      console.log('Error reading language', error);
      return callback('uz');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error caching language', error);
    }
  }
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4', // Needed for react-native
    resources: {
      uz: { translation: uz },
      ru: { translation: ru }
    },
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false // Suspense not well supported in all RN environments for i18n
    }
  });

export default i18n;
