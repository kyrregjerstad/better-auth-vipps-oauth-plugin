import { HttpResponse, http, server } from '../vitest.setup.js';

export function mockDiscoveryUserinfoEndpoint(
	discoveryUrl: string,
	userinfoEndpointUrl: string,
) {
	server.use(
		http.get(discoveryUrl, async () =>
			HttpResponse.json({ userinfo_endpoint: userinfoEndpointUrl }),
		),
	);
}

export function mockDiscoveryInvalidSchema(discoveryUrl: string) {
	server.use(
		http.get(discoveryUrl, async () => HttpResponse.json({ wrong: 'shape' })),
	);
}

export function mockDiscoveryHttpError(
	discoveryUrl: string,
	status = 500,
	body = 'error',
) {
	server.use(
		http.get(discoveryUrl, async () => HttpResponse.text(body, { status })),
	);
}

export function mockUserinfoSuccess(
	userinfoUrl: string,
	responseBody: Record<string, unknown>,
	expectedHeaders?: Record<string, string>,
) {
	server.use(
		http.get(userinfoUrl, async ({ request }) => {
			if (expectedHeaders) {
				for (const [key, value] of Object.entries(expectedHeaders)) {
					const header = request.headers.get(key);
					if (header !== value) {
						return HttpResponse.text(
							`Unexpected header ${key}: ${header} !== ${value}`,
							{
								status: 400,
							},
						);
					}
				}
			}

			return HttpResponse.json(responseBody);
		}),
	);
}

export function mockUserinfoInvalidSchema(userinfoUrl: string) {
	server.use(
		http.get(userinfoUrl, async () => HttpResponse.json({ wrong: 'shape' })),
	);
}

export function mockUserinfoHttpError(
	userinfoUrl: string,
	status = 401,
	body = 'unauthorized',
) {
	server.use(
		http.get(userinfoUrl, async () => HttpResponse.text(body, { status })),
	);
}
