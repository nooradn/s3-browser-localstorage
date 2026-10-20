import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const path = new URL(context.url).pathname
  if (path === '/login' || path === '/login/') {
    return context.redirect('/app')
  }
  return next()
})
