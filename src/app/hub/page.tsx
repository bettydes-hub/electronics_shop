import { redirect } from "next/navigation";

/** Legacy URL: store home is the customer landing page. */
export default function HubPage() {
  redirect("/");
}
