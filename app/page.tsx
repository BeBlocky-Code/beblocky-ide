import { redirect } from "next/navigation";

const AUTH_APP_URL =
  process.env.NEXT_PUBLIC_AUTH_APP_URL || "https://beblocky.com";

export default function HomePage() {
  // Send visitors to the auth/portal app; courses are opened via .../courses/:encryptedId/learn
  redirect(AUTH_APP_URL);
}
