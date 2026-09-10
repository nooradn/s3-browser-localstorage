import { defineMiddleware } from 'astro:middleware'
import { getSessionUser } from './lib/supabase'

const AUTH_PAGE = /^\/app(\/|$)/
const AUTH_API = /^\/api\/s3(\/|$)/

export const onRequest = defineMiddleware(async (context, next) => {
  const path = new URL(context.url).pathname
  const needsAuth = AUTH_PAGE.test(path) || AUTH_API.test(path)
  if (!needsAuth) return next()

  const user = await getSessionUser(context.cookies)
  context.locals.user = user

  if (!user) {
    if (AUTH_API.test(path)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }
    return context.redirect('/login')
  }

  return next()
})