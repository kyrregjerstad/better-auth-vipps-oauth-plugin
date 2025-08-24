import { genericOAuth } from 'better-auth/plugins';
import { createAuthParams, getDiscoveryUrl, validateConfig, getBaseUrl } from './config';
import { VippsOAuthConfig, VippsUserInfo } from './types';
import { fetchVippsUserInfo } from './userinfo';

/**
 * Vipps OAuth plugin for better-auth
 *
 * Provides OAuth2/OpenID Connect authentication with Vipps MobilePay.
 * Supports all Vipps markets (NO, DK, FI, SE) and various authentication flows.
 *
 * @example
 * ```typescript
 * import { vippsOAuth } from '@vevr/auth/plugins/vippsOAuth';
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     vippsOAuth({
 *       clientId: process.env.VIPPS_CLIENT_ID!,
 *       clientSecret: process.env.VIPPS_CLIENT_SECRET!,
 *       redirectUri: 'https://example.com/auth/callback',
 *       market: 'NO', // Optional: NO, DK, FI, SE
 *       testMode: true, // Optional: use test environment
 *     })
 *   ]
 * });
 * ```
 */
export function vippsOAuth(options: VippsOAuthConfig): ReturnType<typeof genericOAuth> {
  const config = validateConfig(options);
  const discoveryUrl = getDiscoveryUrl(config.environment);
  const authParams = createAuthParams(config);

  return genericOAuth({
    config: [
      {
        providerId: 'vipps',
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        discoveryUrl,
        scopes: config.scopes,
        redirectURI: config.redirectUri,
        pkce: true,
        responseType: 'code',
        responseMode: config.responseMode,
        prompt: config.prompt,
        authorizationUrlParams: authParams,
        authentication: config.authentication,
        overrideUserInfo: config.overrideUserInfo,

        getUserInfo: async (tokens) => {
          if (!tokens.accessToken) {
            throw new Error('No access token provided');
          }

          try {
            const userInfo = await fetchVippsUserInfo({
              accessToken: tokens.accessToken,
              discoveryUrl,
              baseUrl: getBaseUrl(config.environment),
              userinfoHeaders: config.userinfoHeaders,
              discoveryCache: config.discoveryCache,
            });

            if (!userInfo) {
              return null;
            }

            return {
              id: userInfo.sub,
              emailVerified: userInfo.email_verified,
              ...userInfo,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          } catch (error) {
            console.error('[vippsOAuth] Failed to get user info:', error);
            return null;
          }
        },

        mapProfileToUser: options.mapProfileToUser
          ? (profile) => options.mapProfileToUser!(profile as VippsUserInfo)
          : undefined,
      },
    ],
  });
}

export type { VippsAddress, VippsOAuthConfig, VippsUserInfo } from './types';

export { VippsAPIError, VippsConfigError, VippsOAuthError } from './types';
