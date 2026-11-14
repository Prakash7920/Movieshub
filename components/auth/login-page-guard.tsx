"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession } from "next-auth/react";

export function LoginPageGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const requestedPath = searchParams.get("callbackUrl");
    let destination = "/dashboard";
    if (requestedPath?.startsWith("/") && !requestedPath.startsWith("//")) {
      try {
        if (new URL(requestedPath, window.location.origin).origin === window.location.origin) {
          destination = requestedPath;
        }
      } catch {
        destination = "/dashboard";
      }
    }

    let active = true;
    const redirectIfSignedIn = async () => {
      try {
        const session = await getSession();
        const sessionUser = session?.user as unknown as { id?: string } | undefined;
        if (active && sessionUser?.id) router.replace(destination);
      } catch {
        // Keep the login page available if the session check cannot complete.
      }
    };

    void redirectIfSignedIn();
    const handlePageShow = () => { void redirectIfSignedIn(); };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router, searchParams]);

  return null;
}
