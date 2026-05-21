import { createContext, useContext } from 'react'

/**
 * Carries the currently-rendered page id so blocks (or their inline
 * editors) can mutate themselves without prop-drilling. Only meaningful
 * inside a BrandPageView; outside the value is null.
 */
export const CurrentPageContext = createContext<{ pageId: string | null }>({ pageId: null })

export function useCurrentPageId(): string | null {
  return useContext(CurrentPageContext).pageId
}
