import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: (_lngs: string[], namespaces: string[]) => {
        return namespaces.map((namespace: string) =>
          namespace === 'common' ? '/i18n' : `/${namespace}/i18n`,
        );
      },
      parse: (data: string) => JSON.parse(data),
    },
    defaultNS: 'common',
    ns: ['common', 'minibadge'],
    fallbackLng: 'fr',
    lng: 'fr',
    interpolation: {
      escapeValue: false,
      prefix: '[[',
      suffix: ']]',
    },
    debug: false,
  });

export default i18n;
