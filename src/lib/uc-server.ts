import "server-only";
import { resolveVerifiedUcLogin, type ResolvedUcLogin, type UcLoginBody } from "@/lib/uc-login-core";

interface UcNodeToken {
  expires_in?: number;
  user_id?: string | number;
}

interface UcNodeAccountInfo {
  nick_name?: string;
  nickName?: string;
  real_name?: string;
  realName?: string;
  account_name?: string;
  accountName?: string;
  user_name?: string;
  userName?: string;
  user_id?: string | number;
  userId?: string | number;
  account_id?: string | number;
  accountId?: string | number;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export async function verifyUcKeyWithSdk(uckey: string, url?: string) {
  const { UC } = await import("@sdp.nd/nd-uc-sdk/dist/UC-SDK.node.js");
  const uc = new UC({
    env: process.env.UC_ENV || process.env.NEXT_PUBLIC_UC_ENV || "product",
    sdpAppId: process.env.UC_SDP_APP_ID || process.env.NEXT_PUBLIC_UC_SDP_APP_ID || "",
  });

  await uc.loginByUCKey(url ? { uckey, url } : { uckey });

  const token = uc.getToken() as UcNodeToken;
  let info: UcNodeAccountInfo = {};
  try {
    info = (await uc.getCurrentAccount().getAccountInfo()) as UcNodeAccountInfo;
  } catch (err) {
    console.error("[uc] failed to fetch account info after token validation", err);
  }

  const userId = firstString(token.user_id, info.user_id, info.userId, info.account_id, info.accountId);
  if (!userId) {
    throw new Error("UC token missing user_id");
  }

  const nickname =
    firstString(info.nick_name, info.nickName, info.real_name, info.realName, info.account_name, info.accountName, info.user_name, info.userName);
  const avatar = Number.isFinite(Number(userId))
    ? uc.getAvatarURL({ accountId: Number(userId), size: 160, ext: "jpg" })
    : undefined;

  return {
    userId,
    nickname,
    avatar,
    expiresIn: token.expires_in,
  };
}

export function verifyUcLoginBody(body: UcLoginBody, url?: string): Promise<ResolvedUcLogin> {
  return resolveVerifiedUcLogin(body, (uckey) => verifyUcKeyWithSdk(uckey, url));
}
