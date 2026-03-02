# My-Gaff-List Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare                          │
│              (DNS + TLS + DDoS Protection)              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS (443)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    VPS (Hetzner/DO)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │                    Nginx                         │   │
│  │              (Reverse Proxy)                     │   │
│  └──────────┬─────────────────────┬────────────────┘   │
│             │                     │                     │
│      /api/* │              /* (frontend)               │
│             ▼                     ▼                     │
│  ┌──────────────┐       ┌──────────────┐              │
│  │   Backend    │       │   Frontend   │              │
│  │   (Django)   │       │   (Next.js)  │              │
│  │   :8000      │       │   :3000      │              │
│  └──────┬───────┘       └──────────────┘              │
│         │                                              │
│    ┌────┴────┐                                        │
│    ▼         ▼                                        │
│ ┌──────┐ ┌──────┐                                    │
│ │Postgres│ │Redis │                                    │
│ │ :5432  │ │:6379 │                                    │
│ └────────┘ └──────┘                                    │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Domain name (e.g., mygafflist.ie)
- Cloudflare account (free tier)
- VPS with:
  - Ubuntu 22.04 LTS
  - 2+ vCPU, 4GB+ RAM
  - 40GB+ SSD
  - Docker & Docker Compose installed

## Step 1: VPS Setup

### 1.1 Create VPS

**Hetzner (Recommended - Best value):**
- CX21: €4.85/month (2 vCPU, 4GB RAM, 40GB SSD)
- Location: Falkenstein or Helsinki (closest to Ireland)

**DigitalOcean:**
- Basic Droplet: $12/month (2 vCPU, 2GB RAM)

### 1.2 Initial Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Create deploy user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Setup SSH key for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version

# Logout and login as deploy user
exit
```

### 1.3 Configure Firewall

```bash
ssh deploy@YOUR_SERVER_IP

# Setup UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Step 2: Cloudflare Setup

### 2.1 Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click "Add a Site"
3. Enter your domain (e.g., mygafflist.ie)
4. Select Free plan
5. Update nameservers at your registrar

### 2.2 Configure DNS Records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_SERVER_IP | ✅ Proxied |
| A | www | YOUR_SERVER_IP | ✅ Proxied |
| A | api | YOUR_SERVER_IP | ✅ Proxied |

### 2.3 SSL/TLS Settings

1. Go to SSL/TLS → Overview
2. Set encryption mode to **Full (strict)**
3. Go to SSL/TLS → Edge Certificates
4. Enable "Always Use HTTPS"
5. Enable "Automatic HTTPS Rewrites"

### 2.4 Security Settings

1. Go to Security → Settings
2. Set Security Level to "Medium"
3. Enable Bot Fight Mode

## Step 3: Deploy Application

### 3.1 Clone Repository

```bash
ssh deploy@YOUR_SERVER_IP

cd ~
git clone https://github.com/dooco/my-gaff-list.git
cd my-gaff-list
```

### 3.2 Configure Environment

```bash
# Copy example env file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Required values:**
```bash
# Generate a secure secret key
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# .env.production
DJANGO_ENV=production
SECRET_KEY=<generated-key>
ALLOWED_HOSTS=mygafflist.ie,www.mygafflist.ie,api.mygafflist.ie

DB_NAME=mygafflist
DB_USER=mygafflist
DB_PASSWORD=<secure-password>
DB_HOST=db
DB_PORT=5432

REDIS_URL=redis://redis:6379/0

SENTRY_DSN=<your-sentry-dsn>

API_URL=https://api.mygafflist.ie
NEXT_PUBLIC_API_URL=https://api.mygafflist.ie
```

### 3.3 Update Nginx for Your Domain

```bash
nano nginx/nginx.conf
```

Update server_name directives with your domain.

### 3.4 Build and Start

```bash
# Build images
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Start services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3.5 Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## Step 4: Verify Deployment

### 4.1 Health Checks

```bash
# Backend health
curl https://api.mygafflist.ie/api/health/

# Frontend
curl -I https://mygafflist.ie
```

### 4.2 Test Authentication Flow

1. Visit https://mygafflist.ie
2. Register a new account
3. Login and verify cookies are set
4. Test property listing features

## Step 5: Ongoing Maintenance

### 5.1 Deploy Updates

```bash
cd ~/my-gaff-list
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Or use the helper script:
```bash
./scripts/deploy.sh
```

### 5.2 View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### 5.3 Database Backup

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U mygafflist mygafflist > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U mygafflist mygafflist
```

Or use the helper script:
```bash
./scripts/backup.sh
```

### 5.4 SSL Certificate (Cloudflare Origin)

For Full (strict) SSL, create an origin certificate:

1. Cloudflare → SSL/TLS → Origin Server
2. Create Certificate (15 years validity)
3. Save as `nginx/ssl/origin.pem` and `nginx/ssl/origin.key`
4. Update nginx.conf to use these certs

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.prod.yml logs backend
```

### Database connection issues
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py dbshell
```

### Clear everything and restart
```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

### Check Cloudflare connection
```bash
# Verify Cloudflare is proxying
curl -I https://mygafflist.ie | grep -i cf-ray
```

### WebSocket issues
If real-time features aren't working:
1. Check Cloudflare → Network → WebSockets is enabled
2. Verify nginx is configured for WebSocket upgrade headers

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Hetzner CX21 | €4.85 |
| Cloudflare | Free |
| Domain (.ie) | ~€15/year |
| **Total** | **~€6/month** |

## Quick Start Checklist

- [ ] Provision VPS (Hetzner CX21 recommended)
- [ ] Install Docker & Docker Compose
- [ ] Configure firewall (UFW)
- [ ] Add domain to Cloudflare
- [ ] Configure DNS A records (proxied)
- [ ] Set SSL mode to Full (strict)
- [ ] Clone repository to VPS
- [ ] Configure .env.production
- [ ] Generate Cloudflare origin certificate
- [ ] Update nginx.conf with SSL certs
- [ ] Build and start containers
- [ ] Run database migrations
- [ ] Create superuser
- [ ] Verify health endpoints
- [ ] Test authentication flow
- [ ] Set up automated backups (cron)
