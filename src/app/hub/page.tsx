import { redirect } from "next/navigation";

/** Legacy URL: store home is the catalog. */
export default function HubPage() {
  redirect("/catalog");
}
