import { describe, expect, it } from 'vitest';
import {
	createAuthParams,
	getDiscoveryUrl,
	validateConfig,
} from '../config.js';

describe('vippsOAuth config integration', () => {
	it('validates and applies defaults', () => {
		const cfg = validateConfig({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'prod',
			redirectUri: 'https://app.example.com/callback',
		});

		expect(cfg.scopes.includes('openid')).toBe(true);
		expect(cfg.responseMode).toBe('query');
		expect(cfg.authentication).toBe('post');
		expect(cfg.overrideUserInfo).toBe(false);
	});

	it('rejects config missing openid scope when presets and overrides are misconfigured', () => {
		// Simulate attempting to remove openid (our validateConfig will enforce inclusion)
		const cfg = validateConfig({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'prod',
			redirectUri: 'https://app.example.com/callback',
			scopes: ['email', 'name', 'phoneNumber'],
		});

		expect(cfg.scopes).toContain('openid');
	});

	it('creates authorization params with responseMode and custom params', () => {
		const cfg = validateConfig({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'prod',
			redirectUri: 'https://app.example.com/callback',
			responseMode: 'form_post',
			authorizationUrlParams: { foo: 'bar' },
		});

		const params = createAuthParams(cfg);
		expect(params.response_mode).toBe('form_post');
		expect(params.foo).toBe('bar');
	});

	it('supports responseMode fragment in authorization params', () => {
		const cfg = validateConfig({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'test',
			redirectUri: 'https://app.example.com/callback',
			responseMode: 'fragment',
		});

		const params = createAuthParams(cfg);
		expect(params.response_mode).toBe('fragment');
	});

	it('computes correct discovery URL for test and prod', () => {
		expect(getDiscoveryUrl('test')).toBe(
			'https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration',
		);
		expect(getDiscoveryUrl('prod')).toBe(
			'https://api.vipps.no/access-management-1.0/access/.well-known/openid-configuration',
		);
	});

	it('auto-includes openid when scopes are missing it', () => {
		const cfg = validateConfig({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'prod',
			redirectUri: 'https://app.example.com/callback',
			scopes: ['email'],
		});
		expect(cfg.scopes).toContain('openid');
		expect(cfg.scopes).toContain('email');
	});

	it('merges scopesPreset with explicit scopes and de-duplicates', () => {
		const cfg = validateConfig({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'prod',
			redirectUri: 'https://app.example.com/callback',
			scopesPreset: 'address',
			scopes: ['email', 'openid'],
		});

		// address preset implies address, and openid should only appear once
		expect(cfg.scopes).toContain('address');
		expect(cfg.scopes.filter((s) => s === 'openid').length).toBe(1);
		expect(cfg.scopes).toContain('email');
		expect(cfg.scopes).toContain('name');
		expect(cfg.scopes).toContain('phoneNumber');
	});
});
