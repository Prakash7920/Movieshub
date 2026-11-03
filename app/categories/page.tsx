import { redirect } from "next/navigation";

export default function CategoriesPage() {
  // Keep the legacy route on the same live, licence-filtered catalogue.
  redirect("/movies");
}
