import { promises as dns } from 'node:dns';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

const MAX_SPEC_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 15_000;

function isPrivateIP(addr: string): boolean {
  return PRIVATE_RANGES.some((pattern) => pattern.test(addr));
}

/**
 * Fetch a spec from a URL with SSRF protection.
 * Resolves DNS, validates IPs, then fetches using the resolved IP
 * to prevent DNS rebinding attacks.
 */
export async function fetchSpecFromUrl(url: string): Promise<unknown> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  // Resolve DNS and check for private IPs
  let addresses: string[];
  try {
    addresses = await dns.resolve4(parsed.hostname);
  } catch {
    try {
      addresses = await dns.resolve6(parsed.hostname);
    } catch {
      throw new Error('Could not resolve hostname');
    }
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      throw new Error('URL resolves to a private IP address');
    }
  }

  // Fetch using the resolved IP to prevent DNS rebinding.
  // Replace hostname with the first validated IP, keep original Host header.
  const resolvedUrl = new URL(url);
  const originalHost = resolvedUrl.host;
  resolvedUrl.hostname = addresses[0]!;

  const response = await fetch(resolvedUrl.toString(), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: 'application/json, application/yaml, text/yaml, text/plain',
      Host: originalHost,
    },
    redirect: 'error', // Block redirects — they could redirect to internal IPs
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spec: HTTP ${response.status}`);
  }

  const text = await response.text();
  if (text.length > MAX_SPEC_SIZE) {
    throw new Error('Spec file exceeds 10MB limit');
  }

  return parseJsonOrYaml(text);
}

/**
 * Safe fetch with SSRF protection. Validates that a URL
 * does not target private/internal hosts. For use by the test endpoint.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  let addresses: string[];
  try {
    addresses = await dns.resolve4(parsed.hostname);
  } catch {
    try {
      addresses = await dns.resolve6(parsed.hostname);
    } catch {
      throw new Error('Could not resolve hostname');
    }
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      throw new Error('URL resolves to a private IP address');
    }
  }

  const resolvedUrl = new URL(url);
  const originalHost = resolvedUrl.host;
  resolvedUrl.hostname = addresses[0]!;

  return fetch(resolvedUrl.toString(), {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Host: originalHost,
    },
    redirect: 'error',
  });
}

function parseJsonOrYaml(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Spec must be valid JSON');
  }
}
