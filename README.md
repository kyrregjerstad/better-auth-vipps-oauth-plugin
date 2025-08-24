## Vipps OAuth plugin for Better Auth

A small plugin that adds Vipps MobilePay OAuth2/OpenID Connect to Better Auth.

### Install

```bash
pnpm add @kyrregjerstad/vipps-oauth-plugin
# peer dep
pnpm add better-auth
```

### Quick start

```ts
import { betterAuth } from 'better-auth';
import { vippsOAuth } from '@kyrregjerstad/vipps-oauth-plugin';

export const auth = betterAuth({
	plugins: [
		vippsOAuth({
			clientId: process.env.VIPPS_CLIENT_ID!,
			clientSecret: process.env.VIPPS_CLIENT_SECRET!,
			environment: process.env.NODE_ENV === 'production' ? 'prod' : 'test',
			// redirectUri: 'https://your.app/api/auth/callback', // optional
			// scopesPreset: 'basic', // or 'profile' | 'address'
		})
	]
});
```

### Options (most common)

- **environment**: `'test' | 'prod'`
- **redirectUri**: optional custom callback URL
- **scopesPreset**: `'basic' | 'profile' | 'address'` (adds sensible scopes)
- **scopes**: custom scopes array (always includes `openid`)

You can also map the OIDC profile to your user schema:

```ts
vippsOAuth({
	/* ...required config... */
	mapProfileToUser: (profile) => ({ name: profile.name, email: profile.email })
});
```

### Types

Exports useful types like `VippsOAuthConfig` and `VippsUserInfo`.

### License

MIT


