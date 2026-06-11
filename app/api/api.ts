export async function authFetch(url: string, options: RequestInit = {}) {
  if (typeof window === "undefined") {
    return fetch(url, options)
  }

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    undefined

  const headers = new Headers((options.headers as HeadersInit) || {})

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const body = options.body
  const hasContentType = Array.from(headers.keys()).some(
    (k) => k.toLowerCase() === "content-type"
  )

  if (!hasContentType && body != null && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: (options.credentials as RequestCredentials) ?? "include",
  }

  return fetch(url, finalOptions)
}
