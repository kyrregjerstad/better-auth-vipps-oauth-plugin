import { z } from 'zod';
import {
	GetUserInfoArgs,
	VippsUserInfo,
	VippsAPIError,
	discoverySchema,
	vippsUserinfoSchema,
} from './types';

/**
 * Fetches user information from Vipps using the access token
 */
export async function fetchVippsUserInfo(
	args: GetUserInfoArgs,
): Promise<VippsUserInfo | null> {
	const {
		accessToken,
		discoveryUrl,
		baseUrl,
		userinfoHeaders,
		discoveryCache,
	} = args;

	try {
		// Fetch discovery document
		const discoveryDoc = await fetchDiscoveryDocument(
			discoveryUrl,
			discoveryCache,
		);
		if (!discoveryDoc) {
			return null;
		}

		// Determine userinfo endpoint
		const userinfoUrl =
			discoveryDoc.userinfo_endpoint ||
			`${baseUrl}/vipps-userinfo-api/userinfo`;

		// Fetch user info
		const userInfo = await fetchUserInfoFromEndpoint(
			userinfoUrl,
			accessToken,
			userinfoHeaders,
		);

		return userInfo;
	} catch (error) {
		if (error instanceof VippsAPIError) {
			throw error;
		}
		throw new VippsAPIError(
			`Failed to fetch Vipps user info: ${error instanceof Error ? error.message : 'Unknown error'}`,
			undefined,
			error,
		);
	}
}

/**
 * Fetches and validates the OpenID Connect discovery document
 */
async function fetchDiscoveryDocument(
	discoveryUrl: string,
	cache?: GetUserInfoArgs['discoveryCache'],
): Promise<{ userinfo_endpoint: string } | null> {
	try {
		const cacheKey = `vipps.discovery:${discoveryUrl}`;
		if (cache) {
			const cached = (await cache.get(cacheKey)) as
				| { userinfo_endpoint: string }
				| undefined;
			if (cached && cached.userinfo_endpoint) {
				return cached;
			}
		}

		const response = await fetch(discoveryUrl, {
			headers: { Accept: 'application/json' },
		});

		if (!response.ok) {
			throw new VippsAPIError(
				`Discovery endpoint returned ${response.status}: ${response.statusText}`,
				response.status,
			);
		}

		const json = await response.json();
		const parsed = discoverySchema.safeParse(json);

		if (!parsed.success) {
			console.warn(
				'[vippsOAuth] Discovery schema validation failed:',
				z.treeifyError(parsed.error),
			);
			return null;
		}

		const data = parsed.data;
		if (cache) {
			const ttl = typeof cache.ttlMs === 'number' ? cache.ttlMs : 3600_000;
			await cache.set(cacheKey, data, ttl);
		}
		return data;
	} catch (error) {
		if (error instanceof VippsAPIError) {
			throw error;
		}

		console.warn('[vippsOAuth] Failed to fetch discovery document:', error);
		return null;
	}
}

/**
 * Fetches user info from the userinfo endpoint
 */
async function fetchUserInfoFromEndpoint(
	userinfoUrl: string,
	accessToken: string,
	extraHeaders?: Record<string, string>,
): Promise<VippsUserInfo | null> {
	const headers = new Headers();
	headers.set('Authorization', `Bearer ${accessToken}`);
	headers.set('Accept', 'application/json');

	if (extraHeaders) {
		for (const [key, value] of Object.entries(extraHeaders)) {
			headers.set(key, value);
		}
	}

	try {
		const response = await fetch(userinfoUrl, { headers });

		if (!response.ok) {
			const errorBody = await response.text().catch(() => 'Unknown error');
			throw new VippsAPIError(
				`Userinfo endpoint returned ${response.status}: ${errorBody}`,
				response.status,
				{ url: userinfoUrl, status: response.status, body: errorBody },
			);
		}

		const json = await response.json();
		const parsed = vippsUserinfoSchema.safeParse(json);

		if (!parsed.success) {
			console.warn(
				'[vippsOAuth] Userinfo schema validation failed:',
				z.treeifyError(parsed.error),
			);
			return null;
		}

		return parsed.data;
	} catch (error) {
		if (error instanceof VippsAPIError) {
			throw error;
		}

		throw new VippsAPIError(
			`Failed to fetch user info: ${error instanceof Error ? error.message : 'Unknown error'}`,
			undefined,
			error,
		);
	}
}
