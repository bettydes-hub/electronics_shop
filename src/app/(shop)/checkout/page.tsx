import { redirect } from "next/navigation";

/** Checkout removed — cart is for saving items to use later. */
export default function CheckoutPage() {
  redirect("/cart");
}
