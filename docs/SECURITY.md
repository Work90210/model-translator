# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email **security@apifold.dev** with a description of the vulnerability
3. Include steps to reproduce the issue and any relevant details
4. Allow up to 72 hours for an initial response

## Responsible Disclosure Timeline

We follow a 90-day responsible disclosure policy:

1. **Day 0** -- Vulnerability reported to security@apifold.dev
2. **Within 72 hours** -- Acknowledgment and initial triage
3. **Within 14 days** -- Assessment and severity classification
4. **Within 90 days** -- Fix developed, tested, and released
5. **After fix** -- Public disclosure coordinated with the reporter

If the vulnerability is actively exploited in the wild, we will expedite the fix and may issue an out-of-band release.

## Security Measures

### Authentication and Authorization

- Dashboard and API endpoints protected by [Clerk](https://clerk.com) authentication
- Short-lived JWT session tokens validated on every request
- Webhook endpoints verified via provider-specific signatures (Stripe, Clerk)
- MCP server connections support configurable auth modes (none, API key, Bearer token)

### Credential Encryption

- All upstream API credentials encrypted at rest using **AES-256-GCM**
- Key derivation via **PBKDF2** with 100,000 iterations
- Random 12-byte IV per encryption operation
- 128-bit GCM authentication tag for integrity verification
- Plaintext credentials exist only in process memory during upstream API calls
- Vault key rotation supported via `scripts/rotate-vault-secret.ts`

### Input Validation

- All user inputs validated using Zod schema-based validation
- SQL injection prevention via parameterized queries (Drizzle ORM)
- XSS prevention via React's built-in output escaping
- CSRF protection on all state-changing endpoints

### SSRF Protection

- Outbound requests from spec import blocked for private/internal IP ranges
- DNS resolution validated before connecting
- Port restrictions: only 80, 443, 8080, and 8443 allowed
- Protocol restrictions: only HTTP and HTTPS

### Rate Limiting

- Dual-layer rate limiting:
  - **Nginx** -- Per-IP rate limiting at the reverse proxy
  - **Application** -- Per-user and per-server rate limiting via Redis-backed sliding window
- Configurable limits per server for upstream API protection

### Transformer Security

The `@apifold/transformer` package processes untrusted OpenAPI specs with defense-in-depth:

- Prototype pollution prevention (`__proto__`, `constructor`, `prototype` keys filtered)
- Bounded recursion (max 50 levels) to prevent stack overflow
- Memoized `$ref` resolution capped at 1,000 resolutions
- Array and object size limits (10,000 items/keys)
- Glob pattern length capped at 256 characters to prevent ReDoS
- Null-prototype objects for user-controlled key maps

### Infrastructure Security

- Docker images scanned for vulnerabilities with Trivy
- Non-root container users
- Health checks on all services
- Network isolation via Docker networks
- No secrets committed to the repository
- `.env` files gitignored

### Dependency Security

- Automated dependency auditing via `pnpm audit`
- Weekly security scans via GitHub Actions
- Dependabot enabled for automated dependency updates
- Container image scanning before deployment

## Contact

For security-related inquiries: **security@apifold.dev**
