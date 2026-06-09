import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { cookies } from 'next/headers'

const locales = ['ca', 'es', 'en', 'fr', 'ru', 'sr']

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value

  const locale = hasLocale(locales, requested)
    ? requested
    : hasLocale(locales, cookieLocale)
      ? cookieLocale!
      : 'ca'

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})