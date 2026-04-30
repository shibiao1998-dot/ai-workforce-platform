declare module "@sdp.nd/nd-uc-sdk" {
  interface UCOptions {
    env: string;
    sdpAppId: string;
  }

  interface TokenInfo {
    access_token: string;
    mac_key: string;
    expires_in: number;
    user_id?: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface AccountInfo {
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
    [key: string]: unknown;
  }

  interface Account {
    getAccountInfo(): Promise<AccountInfo>;
  }

  interface AvatarOptions {
    accountId: number;
    size: number;
    ext: string;
  }

  class UC {
    constructor(options: UCOptions);
    loginByUCKey(params: { uckey: string; url?: string }): Promise<void>;
    getToken(): TokenInfo;
    getCurrentAccount(): Account;
    getAvatarURL(options: AvatarOptions): string;
  }

  export { UC };
  export default { UC: typeof UC };
}

declare module "@sdp.nd/nd-uc-sdk/dist/UC-SDK.node.js" {
  export { UC } from "@sdp.nd/nd-uc-sdk";
}
