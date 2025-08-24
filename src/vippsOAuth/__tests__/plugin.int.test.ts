import { describe, expect, it } from 'vitest';
import { vippsOAuth } from '..';
import { VippsConfigError } from '../types';

describe('vippsOAuth plugin smoke', () => {
	it('constructs plugin config with valid settings', () => {
		const plugin = vippsOAuth({
			clientId: 'id',
			clientSecret: 'secret',
			environment: 'test',
			redirectUri: 'https://app.example.com/callback',
			overrideUserInfo: true,
		});

		expect(plugin).toBeTruthy();
	});

	it('throws config error when required fields invalid', () => {
		expect(() =>
			vippsOAuth({
				clientId: '',
				clientSecret: 'secret',
				environment: 'test',
				redirectUri: 'https://app.example.com/callback',
			}),
		).toThrow(VippsConfigError);
	});
});
