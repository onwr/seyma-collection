/** Header sepet sayacı ve diğer dinleyiciler için tarayıcı olayı. */
export const CART_UPDATED_EVENT = "little-moms-cart-updated"

export function dispatchCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}
