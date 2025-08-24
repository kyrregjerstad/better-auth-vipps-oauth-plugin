import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../vitest.setup';
import { getBaseUrl } from '../config';
import { VippsAPIError } from '../types';
import { fetchVippsUserInfo } from '../userinfo';
import * as vipps from './vipps.mocks';

const discoveryUrlTest =
	'https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration';

describe('vippsOAuth userinfo integration', () => {
	beforeEach(() => {
		server.resetHandlers();
	});

	it('fetches discovery then userinfo and validates shape', async () => {
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);

		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-1',
				email: 'u@example.com',
				email_verified: true,
				name: 'U Ser',
				given_name: 'U',
				family_name: 'Ser',
				phone_number: '+4712345678',
			},
			{
				authorization: 'Bearer token',
				accept: 'application/json',
				'x-extra': '1',
			},
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
			userinfoHeaders: { 'x-extra': '1' },
		});

		expect(res).toBeTruthy();
		expect(res?.sub).toBe('user-1');
		expect(res?.email).toBe('u@example.com');
	});

	it('includes delegatedConsents on first login when scope is present', async () => {
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);

		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-3',
				email: 'u3@example.com',
				email_verified: true,
				name: 'U Three',
				delegatedConsents: {
					language: 'EN',
					consents: [
						{ id: 'email', accepted: true, required: true },
						{ id: 'sms', accepted: false, required: false },
					],
				},
			},
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
		});

		expect(res?.delegatedConsents?.consents?.length).toBe(2);
	});

	it('omits delegatedConsents on subsequent logins', async () => {
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);
		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-3',
				email: 'u3@example.com',
				email_verified: true,
				name: 'U Three',
			},
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
		});

		expect(res?.delegatedConsents).toBeUndefined();
	});

	it('returns null when discovery schema invalid', async () => {
		vipps.mockDiscoveryInvalidSchema(discoveryUrlTest);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
		});

		expect(res).toBeNull();
	});

	it('throws VippsAPIError on discovery HTTP error', async () => {
		vipps.mockDiscoveryHttpError(discoveryUrlTest, 500, 'boom');

		await expect(
			fetchVippsUserInfo({
				accessToken: 'token',
				discoveryUrl: discoveryUrlTest,
				baseUrl: 'https://apitest.vipps.no',
			}),
		).rejects.toBeInstanceOf(VippsAPIError);
	});

	it('uses fallback userinfo endpoint if discovery lacks one', async () => {
		// Discovery without endpoint will be treated as empty and fallback URL will be used
		vipps.mockDiscoveryUserinfoEndpoint(discoveryUrlTest, '');
		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-2',
				email: 'u2@example.com',
				email_verified: true,
				name: 'U Two',
			},
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
		});

		expect(res?.sub).toBe('user-2');
	});

	it('uses prod fallback userinfo endpoint when discovery lacks one', async () => {
		const discoveryUrlProd = `${getBaseUrl(
			'prod',
		)}/access-management-1.0/access/.well-known/openid-configuration`;
		vipps.mockDiscoveryUserinfoEndpoint(discoveryUrlProd, '');
		vipps.mockUserinfoSuccess(
			'https://api.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-2p',
				email: 'u2p@example.com',
				email_verified: true,
				name: 'U Two P',
			},
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlProd,
			baseUrl: 'https://api.vipps.no',
		});

		expect(res?.sub).toBe('user-2p');
	});

	it('returns null when userinfo schema invalid', async () => {
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);
		vipps.mockUserinfoInvalidSchema(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
		});

		expect(res).toBeNull();
	});

	it('throws VippsAPIError on userinfo HTTP error', async () => {
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);
		vipps.mockUserinfoHttpError(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			401,
			'unauthorized',
		);

		await expect(
			fetchVippsUserInfo({
				accessToken: 'token',
				discoveryUrl: discoveryUrlTest,
				baseUrl: 'https://apitest.vipps.no',
			}),
		).rejects.toBeInstanceOf(VippsAPIError);
	});

	it('accepts optional userinfo fields when present', async () => {
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);
		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-4',
				email: 'u4@example.com',
				email_verified: true,
				name: 'U Four',
				phone_number: '+4712345678',
				phone_number_verified: true,
				address: { country: 'NO', postal_code: '0001' },
				other_addresses: [
					{ country: 'NO', postal_code: '0555' },
					{ country: 'NO', postal_code: '0666' },
				],
			},
		);

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
		});

		expect(res?.phone_number_verified).toBe(true);
		expect(res?.address?.country).toBe('NO');
		expect(res?.other_addresses?.length).toBe(2);
	});

	it('uses discovery cache on hit and skips network discovery', async () => {
		// No discovery handler registered; if network is attempted MSW would error
		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-cache',
				email: 'cache@example.com',
				email_verified: true,
				name: 'Cache Hit',
			},
		);

		const cache = {
			get: async () => ({
				userinfo_endpoint:
					'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			}),
			set: async () => {},
		};

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
			discoveryCache: cache,
		});

		expect(res?.sub).toBe('user-cache');
	});

	it('populates discovery cache with default TTL on miss', async () => {
		let setArgs: unknown[] | undefined;
		vipps.mockDiscoveryUserinfoEndpoint(
			discoveryUrlTest,
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
		);
		vipps.mockUserinfoSuccess(
			'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
			{
				sub: 'user-cache2',
				email: 'cache2@example.com',
				email_verified: true,
				name: 'Cache Miss',
			},
		);

		const cache = {
			get: async () => undefined,
			set: async (...args: unknown[]) => {
				setArgs = args;
			},
		};

		const res = await fetchVippsUserInfo({
			accessToken: 'token',
			discoveryUrl: discoveryUrlTest,
			baseUrl: 'https://apitest.vipps.no',
			discoveryCache: cache,
		});

		expect(res?.sub).toBe('user-cache2');
		// set(key, value, ttlMs)
		expect(Array.isArray(setArgs)).toBe(true);
		expect((setArgs as unknown[] | undefined)?.[0] as string).toContain(
			'vipps.discovery:',
		);
		expect(typeof (setArgs as unknown[] | undefined)?.[2]).toBe('number');
		expect(((setArgs as unknown[] | undefined)?.[2] as number) > 0).toBe(true);
	});
});
