import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['ca', 'es', 'en', 'fr', 'ru', 'sr'],
  defaultLocale: 'ca',
  localePrefix: 'never', // No /ca/ prefix in URLs — use cookie instead
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
