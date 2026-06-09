import { getRequestConfig } from 'next-intl/server'
import { headers } from 'next/headers'

const locales = ['ca', 'es', 'en', 'fr', 'ru', 'sr']

export default getRequestConfig(async () => {
  const headerStore = await headers()
  const locale = headerStore.get('x-locale') || 'ca'
  const validLocale = locales.includes(locale) ? locale : 'ca'

  return {
    locale: validLocale,
    messages: (await import(`../../messages/${validLocale}.json`)).default
  }
})
