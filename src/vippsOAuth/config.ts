import { z } from 'zod';
import {
	VippsOAuthConfig,
	VippsOAuthConfigInternal,
	VippsConfigError,
	VippsEnvironment,
} from './types';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<
	Pick<VippsOAuthConfig, 'scopes' | 'overrideUserInfo' | 'authentication'>
> &
	Pick<VippsOAuthConfig, 'prompt' | 'responseMode'> = {
	scopes: ['openid', 'name', 'email', 'phoneNumber'],
	prompt: undefined,
	responseMode: 'query',
	overrideUserInfo: false,
	authentication: 'post',
};

/**
 * Configuration validation schema
 */
const configSchema = z.object({
	clientId: z.string().min(1, 'clientId is required and cannot be empty'),
	clientSecret: z
		.string()
		.min(1, 'clientSecret is required and cannot be empty'),
	environment: z.enum(['test', 'prod']),
	redirectUri: z.url('redirectUri must be a valid URL').optional(),
	scopes: z
		.array(z.string())
		.min(1, 'At least one scope is required')
		.optional(),
	scopesPreset: z.enum(['basic', 'profile', 'address']).optional(),
	prompt: z.string().optional(),
	responseMode: z.enum(['query', 'form_post', 'fragment']).optional(),
	authorizationUrlParams: z.record(z.string(), z.string()).optional(),
	authentication: z.enum(['basic', 'post']).optional(),
	overrideUserInfo: z.boolean().optional(),
	mapProfileToUser: z.any().optional(),
	userinfoHeaders: z.record(z.string(), z.string()).optional(),
});

/**
 * Validates and normalizes Vipps OAuth configuration
 */
export function validateConfig(
	options: VippsOAuthConfig,
): VippsOAuthConfigInternal {
	try {
		const parsed = configSchema.parse(options);

		// Apply defaults
		const config: VippsOAuthConfigInternal = {
			...DEFAULT_CONFIG,
			...parsed,
		} as VippsOAuthConfigInternal;

		// Compute scopes: start with defaults, apply preset (if any), then explicit scopes
		const presetScopes = getScopesFromPreset(parsed.scopesPreset);
		const mergedScopes = mergeScopes(
			DEFAULT_CONFIG.scopes,
			mergeScopes(presetScopes, parsed.scopes),
		);
		if (!mergedScopes.includes('openid')) {
			throw new VippsConfigError(
				'The "openid" scope is required for Vipps OAuth to function properly',
			);
		}

		config.scopes = mergedScopes;

		return config;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = z.treeifyError(error).errors.join(', ');
			throw new VippsConfigError(`Configuration validation failed: ${issues}`);
		}
		throw error;
	}
}

/**
 * Creates authorization parameters for Vipps OAuth requests
 */
export function createAuthParams(config: VippsOAuthConfigInternal) {
	const params: Record<string, string> = {};
	if (config.responseMode) params.response_mode = config.responseMode;
	if (config.authorizationUrlParams)
		Object.assign(params, config.authorizationUrlParams);
	return params;
}

/**
 * Gets the appropriate base URL based on test mode
 */
export function getBaseUrl(environment: VippsEnvironment): string {
	return environment === 'test'
		? 'https://apitest.vipps.no'
		: 'https://api.vipps.no';
}

/**
 * Gets the discovery URL for OpenID Connect configuration
 */
export function getDiscoveryUrl(environment: VippsEnvironment): string {
	const baseUrl = getBaseUrl(environment);
	return `${baseUrl}/access-management-1.0/access/.well-known/openid-configuration`;
}

/**
 * Scope presets utilities
 */
export function getScopesFromPreset(
	preset?: VippsOAuthConfig['scopesPreset'],
): string[] {
	if (!preset) return [];
	if (preset === 'basic') return ['openid', 'name', 'email'];
	if (preset === 'profile') return ['openid', 'name', 'email', 'phoneNumber'];
	if (preset === 'address')
		return ['openid', 'name', 'email', 'phoneNumber', 'address'];
	return [];
}

export function mergeScopes(a: string[] = [], b?: string[]): string[] {
	const set = new Set<string>([...a, ...(b ?? [])]);
	return Array.from(set);
}
