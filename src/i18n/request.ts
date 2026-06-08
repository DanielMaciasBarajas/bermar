import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'

const locales = ['ca', 'es', 'en', 'fr', 'ru', 'sr']

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(locales, requested) ? requested : 'ca'

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})