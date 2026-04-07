export type OAuthProvider = "instagram" | "facebook" | "tiktok";

export interface OAuthConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface SocialAccountInfo {
  account_id: string;
  account_name: string;
  account_handle?: string;
  avatar_url?: string;
  followers?: number;
  metadata?: Record<string, unknown>;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
