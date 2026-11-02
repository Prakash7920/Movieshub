"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession } from "next-auth/react";

export function LoginPageGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const requestedPath = searchParams.get("callbackUrl");
    const destination =
      requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/dashboard";

    let active = true;
    const redirectIfSignedIn = async () => {
      try {
        const session = await getSession();
        if (active && session?.user) router.replace(destination);
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
