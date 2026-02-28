import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://beblocky.com";

export default function HomePage() {
  // Send visitors to the main app (app service); courses are opened via clients → IDE /courses/:id/learn
  redirect(APP_URL);
}
