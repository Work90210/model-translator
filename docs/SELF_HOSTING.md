# Self-Hosting ApiFold

Deploy ApiFold on your own infrastructure with Docker Compose.

> For the full self-hosting guide with detailed configuration reference, TLS setup, and troubleshooting, see the [documentation site](https://apifold.com/docs/self-hosting).

## Prerequisites

- Docker v24.0+
- Docker Compose v2.0+
- Minimum 2 vCPU, 4GB RAM
- Domain name (optional, required for SSL)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/apifold/apifold.git
cd apifold

# 2. Configure environment variables
cp .env.example .env
# Edit .env — at minimum set: POSTGRES_PASSWORD, REDIS_PASSWORD,
# VAULT_SECRET, VAULT_SALT, MCP_RUNTIME_SECRET
# Generate secrets with: openssl rand -base64 48

# 3. Start the stack
docker compose -f infra/docker-compose.yml up -d
```

Your instance will be available at `http://localhost` (port 80 via nginx).

## Architecture

The Docker Compose stack runs 5 services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **web** | `apifold-web` | 3000 | Next.js dashboard |
| **runtime** | `apifold-runtime` | 3001 | MCP SSE runtime |
| **postgres** | `postgres:16-alpine` | 5432 | Database |
| **redis** | `redis:7-alpine` | 6379 | Pub/sub and caching |
| **nginx** | `nginx:alpine` | 80/443 | Reverse proxy + TLS |

## Health Checks

All services include health checks:

- **Web:** `GET /api/health`
- **Runtime:** `GET /health` (port 9090), `GET /health/live`, `GET /health/ready`
- **Postgres:** `pg_isready`
- **Redis:** `redis-cli ping`

## Managed Services

For deploying with external managed databases (Neon, Supabase, AWS RDS, Upstash, ElastiCache), use `docker-compose.managed.yml`:

```bash
cd infra
docker compose -f docker-compose.managed.yml up -d
```

See the managed providers section below for connection string examples.

### Managed Postgres Providers

| Provider | Pool Max | Notes |
|----------|----------|-------|
| **Neon** | 5-10 | Uses connection pooling by default |
| **Supabase** | 10 | Use pooler connection string (port 6543) |
| **AWS RDS** | 20 | Supports higher connection limits |

### Managed Redis Providers

| Provider | TLS | Notes |
|----------|-----|-------|
| **Upstash** | Auto (`rediss://`) | Global multi-region read replicas |
| **ElastiCache** | `REDIS_TLS=true` | VPC-only access |
| **Redis Cloud** | `REDIS_TLS=true` | Managed clustering |

## Monitoring

Enable the optional Prometheus monitoring stack:

```bash
docker compose --profile monitoring up -d
```

Access Prometheus at `http://localhost:9091`. Available metrics include `active_sse_connections`, `active_workers`, `http_requests_total`, `http_request_duration_ms`, `total_tool_calls`, `tool_call_errors`, and `tool_call_duration_ms`.

## Backup & Restore

```bash
# Backup database
docker exec -t apifold-postgres pg_dump -U mt apifold > backup.sql

# Restore database
cat backup.sql | docker exec -i apifold-postgres psql -U mt apifold
```

**Important:** Also back up your `.env` file. Without `VAULT_SECRET` and `VAULT_SALT`, encrypted credentials cannot be recovered.

## Upgrading

```bash
docker compose -f infra/docker-compose.yml pull
docker compose -f infra/docker-compose.yml up -d
```

Migrations run automatically on startup.

## More Information

See the [full self-hosting guide](https://apifold.com/docs/self-hosting) for:

- Complete environment variable reference
- TLS/SSL setup with Certbot
- Auto-deploy with Watchtower
- Monitoring and observability
- Troubleshooting guide
