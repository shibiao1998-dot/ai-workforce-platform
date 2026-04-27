"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginByUcKey, getUcUserInfo, getAvatarURL } from "@/lib/uc-client";

/**
 * /login/callback?uckey=xxx — UC SSO 回调页
 * 1. 用 uckey 换取 token
 * 2. 获取用户信息
 * 3. POST /api/auth/login 让服务端设置 session cookie
 * 4. 跳转到首页
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
        // 1. UC SDK 登录，换取 token
        const loginResult = await loginByUcKey(key);

        // 2. 获取用户详细信息
        const userInfo = await getUcUserInfo();
        const avatar = getAvatarURL(Number(loginResult.userId));

        // 3. 调用服务端 API 设置 session cookie
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: loginResult.userId || userInfo.userId,
            nickname: userInfo.nickname,
            avatar,
            expiresIn: loginResult.expiresIn,
          }),
        });

        if (!res.ok) {
          throw new Error("服务端登录失败");
        }

        // 4. 跳转到首页
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
