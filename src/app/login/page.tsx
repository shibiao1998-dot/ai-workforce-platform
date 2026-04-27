"use client";

import { useEffect } from "react";
import { redirectToLogin } from "@/lib/uc-client";

/**
 * /login — 直接跳转到 UC SSO 登录页
 */
export default function LoginPage() {
  useEffect(() => {
    redirectToLogin();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">正在跳转到登录页面...</p>
    </div>
  );
}
