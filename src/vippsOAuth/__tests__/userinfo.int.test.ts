import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../../vitest.setup';
import { fetchVippsUserInfo } from '../userinfo';
import { VippsAPIError } from '../types';
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
      'https://apitest.vipps.no/vipps-userinfo-api/userinfo'
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
      }
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
      })
    ).rejects.toBeInstanceOf(VippsAPIError);
  });

  it('uses fallback userinfo endpoint if discovery lacks one', async () => {
    // Discovery without endpoint will be treated as empty and fallback URL will be used
    vipps.mockDiscoveryUserinfoEndpoint(discoveryUrlTest, '');
    vipps.mockUserinfoSuccess('https://apitest.vipps.no/vipps-userinfo-api/userinfo', {
      sub: 'user-2',
      email: 'u2@example.com',
      email_verified: true,
      name: 'U Two',
    });

    const res = await fetchVippsUserInfo({
      accessToken: 'token',
      discoveryUrl: discoveryUrlTest,
      baseUrl: 'https://apitest.vipps.no',
    });

    expect(res?.sub).toBe('user-2');
  });

  it('returns null when userinfo schema invalid', async () => {
    vipps.mockDiscoveryUserinfoEndpoint(
      discoveryUrlTest,
      'https://apitest.vipps.no/vipps-userinfo-api/userinfo'
    );
    vipps.mockUserinfoInvalidSchema(
      'https://apitest.vipps.no/vipps-userinfo-api/userinfo'
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
      'https://apitest.vipps.no/vipps-userinfo-api/userinfo'
    );
    vipps.mockUserinfoHttpError(
      'https://apitest.vipps.no/vipps-userinfo-api/userinfo',
      401,
      'unauthorized'
    );

    await expect(
      fetchVippsUserInfo({
        accessToken: 'token',
        discoveryUrl: discoveryUrlTest,
        baseUrl: 'https://apitest.vipps.no',
      })
    ).rejects.toBeInstanceOf(VippsAPIError);
  });
});
