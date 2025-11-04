declare module '@playwright/test' {
  export const test: any
  export const expect: any
  export const devices: Record<string, any>
  export function defineConfig<T>(config: T): T

  export type Page = any
  export type Browser = any
  export type Locator = any
}
