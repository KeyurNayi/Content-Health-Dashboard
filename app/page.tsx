import { redirect } from "next/navigation";

// Root page redirects to the standalone fullscreen view
export default function RootPage() {
  redirect("/standalone");
}
