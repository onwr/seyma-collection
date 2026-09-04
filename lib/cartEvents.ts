/** Header sepet sayacı ve diğer dinleyiciler için tarayıcı olayı. */
export const CART_UPDATED_EVENT = "seyma-collection-cart-updated"

export function dispatchCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}
