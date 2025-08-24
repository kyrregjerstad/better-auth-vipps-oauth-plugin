import { describe, expect, it } from 'vitest';
import { createAuthParams, getDiscoveryUrl, validateConfig } from '../config';

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

  it('computes correct discovery URL for test and prod', () => {
    expect(getDiscoveryUrl('test')).toBe(
      'https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration'
    );
    expect(getDiscoveryUrl('prod')).toBe(
      'https://api.vipps.no/access-management-1.0/access/.well-known/openid-configuration'
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
});
