declare module "js-cookie" {
  export interface CookieAttributes {
    expires?: number | Date | undefined
    path?: string | undefined
    domain?: string | undefined
    secure?: boolean | undefined
    sameSite?: "strict" | "lax" | "none" | undefined
  }

  export interface CookiesStatic {
    get(name: string): string | undefined
    get(): Record<string, string>
    set(
      name: string,
      value: string | object,
      attributes?: CookieAttributes
    ): void
    set(name: string, value: number, attributes?: CookieAttributes): void
    remove(name: string, attributes?: CookieAttributes): void
  }

  const Cookies: CookiesStatic
  export default Cookies
}
