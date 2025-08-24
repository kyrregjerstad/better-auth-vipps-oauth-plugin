import { z } from 'zod';

/**
 * Vipps environment selection
 */
export type VippsEnvironment = 'test' | 'prod';

/**
 * Discovery cache interface (optional)
 */
export type DiscoveryCache = {
	get: (key: string) => Promise<unknown> | unknown;
	set: (key: string, value: unknown, ttlMs?: number) => Promise<void> | void;
	ttlMs?: number;
};

/**
 * Vipps OAuth configuration options (public)
 * Generic, app-agnostic shape aligned with Better Auth's genericOAuth.
 */
export interface VippsOAuthConfig {
	/** Client ID from Vipps MobilePay portal */
	clientId: string;
	/** Client Secret from Vipps MobilePay portal */
	clientSecret: string;
	/** Vipps environment */
	environment: VippsEnvironment;
	/** Optional custom redirect URI; defaults to Better Auth callback */
	redirectUri?: string;
	/** Requested scopes; 'openid' will always be ensured */
	scopes?: string[];
	/** Scope preset for convenience */
	scopesPreset?: 'basic' | 'profile' | 'address';
	/** Standard OIDC prompt value */
	prompt?: 'none' | 'login' | 'consent' | 'select_account';
	/** Standard OIDC response mode */
	responseMode?: 'query' | 'form_post' | 'fragment';
	/** Extra authorization URL params (advanced) */
	authorizationUrlParams?: Record<string, string>;
	/** Token endpoint auth method passthrough */
	authentication?: 'basic' | 'post';
	/** Override user info on sign in (passthrough) */
	overrideUserInfo?: boolean;
	/** Optional profile mapper (must be synchronous) */
	mapProfileToUser?: (profile: VippsUserInfo) => Record<string, unknown>;
	/** Optional additional headers for userinfo request (advanced) */
	userinfoHeaders?: Record<string, string>;
	/** Optional discovery cache */
	discoveryCache?: DiscoveryCache;
}

/**
 * Internal configuration with defaults applied
 */
export interface VippsOAuthConfigInternal
	extends Omit<VippsOAuthConfig, 'mapProfileToUser' | 'discoveryCache'> {
	// normalized requireds and defaults
	scopes: string[];
	authentication: 'basic' | 'post';
	prompt?: 'none' | 'login' | 'consent' | 'select_account';
	responseMode?: 'query' | 'form_post';
	mapProfileToUser?: (
		profile: Record<string, unknown>,
	) => Record<string, unknown>;
	discoveryCache?: DiscoveryCache;
}

/**
 * Vipps address information
 */
export interface VippsAddress {
	address_type?: string;
	country?: string;
	formatted?: string;
	postal_code?: string;
	region?: string;
	street_address?: string;
}

/**
 * Vipps user information from userinfo endpoint
 */
export interface VippsUserInfo {
	sid?: string; // Session ID, not always present
	sub: string;
	email: string;
	email_verified: boolean;
	name: string;
	given_name?: string;
	family_name?: string;
	phone_number?: string;
	phone_number_verified?: boolean;
	address?: VippsAddress;
	other_addresses?: VippsAddress[];
	delegatedConsents?: VippsDelegatedConsents;
}

/**
 * Vipps delegated consents structure (present only on first login when scope included)
 */
export type VippsDelegatedConsents = {
	language?: string;
	heading?: string;
	termsDescription?: string;
	confirmConsentButtonText?: string;
	links?: {
		termsLinkText?: string;
		termsLinkUrl?: string;
		privacyStatementLinkText?: string;
		privacyStatementLinkUrl?: string;
	};
	timeOfConsent?: string;
	consents?: Array<{
		id?: string;
		accepted?: boolean;
		required?: boolean;
		textDisplayedToUser?: string;
	}>;
};

/**
 * OpenID Connect discovery document
 */
export interface DiscoveryDocument {
	userinfo_endpoint: string;
	authorization_endpoint?: string;
	token_endpoint?: string;
	issuer?: string;
}

/**
 * Arguments for fetching user info
 */
export interface GetUserInfoArgs {
	accessToken: string;
	discoveryUrl: string;
	baseUrl: string;
	userinfoHeaders?: Record<string, string>;
	discoveryCache?: DiscoveryCache;
}

// Zod schemas for runtime validation
export const vippsAddressSchema = z.object({
	address_type: z.string().optional(),
	country: z.string().optional(),
	formatted: z.string().optional(),
	postal_code: z.string().optional(),
	region: z.string().optional(),
	street_address: z.string().optional(),
});

export const vippsUserinfoSchema = z.object({
	sid: z.string().optional(), // Session ID, not always present
	sub: z.string(),
	email: z.email(),
	email_verified: z.boolean(),
	name: z.string(),
	given_name: z.string().optional(),
	family_name: z.string().optional(),
	phone_number: z.string().optional(),
	phone_number_verified: z.boolean().optional(),
	address: vippsAddressSchema.optional(),
	other_addresses: z.array(vippsAddressSchema).optional(),
	delegatedConsents: z
		.object({
			language: z.string().optional(),
			heading: z.string().optional(),
			termsDescription: z.string().optional(),
			confirmConsentButtonText: z.string().optional(),
			links: z
				.object({
					termsLinkText: z.string().optional(),
					termsLinkUrl: z.string().optional(),
					privacyStatementLinkText: z.string().optional(),
					privacyStatementLinkUrl: z.string().optional(),
				})
				.optional(),
			timeOfConsent: z.string().optional(),
			consents: z
				.array(
					z.object({
						id: z.string().optional(),
						accepted: z.boolean().optional(),
						required: z.boolean().optional(),
						textDisplayedToUser: z.string().optional(),
					}),
				)
				.optional(),
		})
		.optional(),
});

export const discoverySchema = z.object({
	userinfo_endpoint: z.string(),
	authorization_endpoint: z.string().optional(),
	token_endpoint: z.string().optional(),
	issuer: z.string().optional(),
});

/**
 * Custom error types for Vipps OAuth
 */
export class VippsOAuthError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = 'VippsOAuthError';
	}
}

export class VippsConfigError extends VippsOAuthError {
	constructor(message: string, details?: unknown) {
		super(message, 'VIPPS_CONFIG_ERROR', details);
		this.name = 'VippsConfigError';
	}
}

export class VippsAPIError extends VippsOAuthError {
	constructor(
		message: string,
		public readonly status?: number,
		details?: unknown,
	) {
		super(message, 'VIPPS_API_ERROR', details);
		this.name = 'VippsAPIError';
	}
}
