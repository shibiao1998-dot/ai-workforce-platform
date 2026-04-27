"use client";

/**
 * UC SSO client-side utilities
 * Runs only in browser — handles redirect to UC login page and UC SDK interaction
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { UC } from "@sdp.nd/nd-uc-sdk";

const UC_SDP_APP_ID = process.env.NEXT_PUBLIC_UC_SDP_APP_ID || "";
const UC_COMPONENT_URL = process.env.NEXT_PUBLIC_UC_COMPONENT_URL || "https://uc-component.sdp.101.com";
const UC_ENV = process.env.NEXT_PUBLIC_UC_ENV || "product";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Redirect to UC SSO login page
 */
export function redirectToLogin() {
  const redirectUri = encodeURIComponent(`${APP_URL}/login/callback`);
  const loginUrl = `${UC_COMPONENT_URL}/?sdp-app-id=${UC_SDP_APP_ID}#/login?redirect_uri=${redirectUri}&send_uckey=true&re_login=true`;
  window.location.href = loginUrl;
}

// UC SDK instance (lazy init)
let ucInstance: InstanceType<typeof UC> | null = null;

function getUC() {
  if (!ucInstance) {
    ucInstance = new UC({
      env: UC_ENV,
      sdpAppId: UC_SDP_APP_ID,
    });
  }
  return ucInstance;
}

export interface UCLoginResult {
  accessToken: string;
  macKey: string;
  expiresIn: number;
  userId: string;
}

/**
 * Exchange uckey for access token via UC SDK
 */
export async function loginByUcKey(uckey: string): Promise<UCLoginResult> {
  const uc = getUC();
  await uc.loginByUCKey({ uckey });
  const tokenInfo = uc.getToken();
  return {
    accessToken: tokenInfo.access_token,
    macKey: tokenInfo.mac_key,
    expiresIn: tokenInfo.expires_in,
    userId: tokenInfo.user_id || "",
  };
}

/**
 * Get user info from UC after login
 * UC SDK 返回的字段名因版本不同可能是 snake_case 或 camelCase
 */
export async function getUcUserInfo(): Promise<{ nickname: string; userId: string }> {
  const uc = getUC();
  const account = uc.getCurrentAccount();
  const info = await account.getAccountInfo();

  // eslint-disable-next-line no-console
  console.log("[UC] getAccountInfo response:", JSON.stringify(info, null, 2));

  // 兼容多种字段名
  const nickname =
    info.nick_name || info.nickName ||
    info.real_name || info.realName ||
    info.account_name || info.accountName ||
    info.user_name || info.userName ||
    "未知用户";

  const userId = String(info.user_id || info.userId || info.account_id || info.accountId || "");

  return { nickname, userId };
}

/**
 * Get avatar URL from UC
 */
export function getAvatarURL(accountId: number, size = 160): string {
  const uc = getUC();
  return uc.getAvatarURL({ accountId, size, ext: "jpg" });
}
