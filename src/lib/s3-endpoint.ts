export function normalizeS3Endpoint(value: string): string {
  let endpoint = value.trim()
  if (!endpoint) return endpoint
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(endpoint)) endpoint = `https://${endpoint}`

  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error('Endpoint S3 tidak valid')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Endpoint S3 harus menggunakan HTTPS')
  }
  if (!url.hostname || url.username || url.password || url.search || url.hash) {
    throw new Error('Endpoint S3 tidak valid')
  }

  return endpoint.replace(/\/+$/, '')
}
