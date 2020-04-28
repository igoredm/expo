import { useCallback, useEffect, useState } from 'react';
import { AuthRequest } from './AuthRequest';
import { ResponseType } from './AuthRequest.types';
import { resolveDiscoveryAsync } from './Discovery';
import { TokenResponse } from './TokenRequest';
/**
 * Fetch the discovery document from an OpenID Connect issuer.
 *
 * @param issuerOrDiscovery
 */
export function useAutoDiscovery(issuerOrDiscovery) {
    const [discovery, setDiscovery] = useState(null);
    useEffect(() => {
        resolveDiscoveryAsync(issuerOrDiscovery).then(discovery => {
            setDiscovery(discovery);
        });
    }, [issuerOrDiscovery]);
    return discovery;
}
/**
 * Load an authorization request.
 * Returns a loaded request, a response, and a prompt method.
 * When the prompt method completes then the response will be fulfilled.
 *
 * @param config
 * @param discovery
 */
export function useAuthRequest(config, discovery) {
    const [request, setRequest] = useState(null);
    const [result, setResult] = useState(null);
    const promptAsync = useCallback(async (options = {}) => {
        if (!discovery || !request) {
            throw new Error('Cannot prompt to authenticate until the request has finished loading.');
        }
        const result = await request?.promptAsync(discovery, options);
        setResult(result);
        return result;
    }, [request?.url, discovery?.authorizationEndpoint]);
    useEffect(() => {
        if (config && discovery) {
            const request = new AuthRequest(config);
            request.makeAuthUrlAsync(discovery).then(() => setRequest(request));
        }
    }, [
        discovery?.authorizationEndpoint,
        config.clientId,
        config.redirectUri,
        config.prompt,
        config.scopes.join(','),
        config.clientSecret,
        config.codeChallenge,
        config.state,
        JSON.stringify(config.extraParams || {}),
        config.usePKCE,
    ]);
    return [request, result, promptAsync];
}
/**
 * Load an implicit authorization request.
 * Returns a loaded request, a response, and a prompt method.
 * When the prompt method completes then the response will be fulfilled.
 *
 * @param config
 * @param discovery
 */
export function useImplicitAuthRequest(config, discovery) {
    const [request, result, promptAsync] = useAuthRequest({ ...config, responseType: ResponseType.Token }, discovery);
    const [response, setResponse] = useState(null);
    useEffect(() => {
        if (result?.type === 'success') {
            if (result.params.access_token) {
                const { access_token, token_type, expires_in, refresh_token, scope, state, id_token, issued_at, } = result.params;
                setResponse(new TokenResponse({
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    scope,
                    state,
                    idToken: id_token,
                    // @ts-ignore: expected TokenType
                    tokenType: token_type,
                    // @ts-ignore: expected number
                    expiresIn: expires_in,
                    // @ts-ignore: expected number
                    issuedAt: issued_at,
                }));
            }
        }
    }, [result, result?.type === 'success' && result.params.access_token]);
    return [request, result, promptAsync, response];
}
//# sourceMappingURL=AuthRequestHooks.js.map