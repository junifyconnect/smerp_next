/**
 * Route Params 타입 (Dynamic Route)
 */
export type RouteParams<T extends Record<string, string>> = {
  params: Promise<T>
}

/**
 * SearchParams 타입 (URL Query)
 */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

