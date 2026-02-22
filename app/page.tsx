import { redirect } from "next/navigation";

export default function HomePage() {
  // Server-side redirect before any response is sent - avoids ERR_HTTP_HEADERS_SENT
  redirect("/courses/1/learn/user/guest");
}
