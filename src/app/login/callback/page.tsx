"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /login/callback?uckey=xxx — UC SSO 回调页
 * 1. POST uckey 到服务端
 * 2. 服务端校验 UC 登录身份并设置 session cookie
 * 3. 跳转到首页
 */
export default function LoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const uckey = searchParams.get("uckey");
    if (!uckey || processedRef.current) return;
    processedRef.current = true;

    async function handleCallback(key: string) {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uckey: key }),
        });

        if (!res.ok) {
          throw new Error("服务端登录失败");
        }

        router.replace("/");
      } catch (err) {
        console.error("登录回调失败:", err);
        setError(err instanceof Error ? err.message : "登录失败，请重试");
      }
    }

    handleCallback(uckey);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => router.replace("/login")}
          className="text-primary underline"
        >
          重新登录
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">登录中，请稍候...</p>
    </div>
  );
}
