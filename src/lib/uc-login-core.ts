export interface UcLoginBody {
  userId?: unknown;
  nickname?: unknown;
  avatar?: unknown;
  expiresIn?: unknown;
  uckey?: unknown;
}

export interface VerifiedUcIdentity {
  userId: string;
  nickname?: string;
  avatar?: string;
  expiresIn?: number;
}

export interface ResolvedUcLogin {
  userId: string;
  nickname: string;
  avatar: string;
  expiresIn?: number;
}

export type UcKeyVerifier = (uckey: string) => Promise<VerifiedUcIdentity>;

export class UcLoginVerificationError extends Error {
  status = 401;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function resolveVerifiedUcLogin(
  body: UcLoginBody,
  verifyUcKey: UcKeyVerifier
): Promise<ResolvedUcLogin> {
  const uckey = asNonEmptyString(body.uckey);
  if (!uckey) {
    throw new UcLoginVerificationError("缺少 uckey,无法验证 UC 登录身份");
  }

  const verified = await verifyUcKey(uckey);
  const verifiedUserId = asNonEmptyString(verified.userId);
  if (!verifiedUserId) {
    throw new UcLoginVerificationError("UC 登录凭据未返回有效用户 ID");
  }

  const submittedUserId = body.userId == null ? null : String(body.userId).trim();
  if (submittedUserId && submittedUserId !== verifiedUserId) {
    throw new UcLoginVerificationError("客户端 userId 与 UC 验证结果不匹配");
  }

  const nickname =
    asNonEmptyString(verified.nickname) ??
    asNonEmptyString(body.nickname) ??
    "未知用户";
  const avatar = asNonEmptyString(verified.avatar) ?? asNonEmptyString(body.avatar) ?? "";

  return {
    userId: verifiedUserId,
    nickname,
    avatar,
    expiresIn: asPositiveNumber(verified.expiresIn) ?? asPositiveNumber(body.expiresIn),
  };
}
