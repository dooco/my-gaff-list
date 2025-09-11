# AWS RDS Setup Guide for my-gaff-list

## Quick Start

Your RDS instance is already created and configured:

- **Endpoint**: `rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com`
- **Region**: eu-west-1 (Ireland)
- **Engine**: PostgreSQL 17.4
- **Status**: Available and publicly accessible

## Setup Steps

### 1. Configure Environment

Edit `.env.production` with your actual values:

```bash
# Update with your actual password
DB_PASSWORD=YourActualPasswordHere
# Update with your domain
ALLOWED_HOSTS=rentified.ie
# Add your other API keys as needed
```

### 2. Create Database and User

Connect to RDS and run the setup script:

```bash
# Connect as master user
psql -h rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com -U postgres -d postgres

# Run the SQL script (after updating passwords)
\i scripts/setup_database.sql
```

### 3. Test Connection

```bash
# Test with automated script
python test_rds_auto.py

# Or test with interactive script
python test_rds.py
```

### 4. Run Django Setup

```bash
# Activate virtual environment
source venv/bin/activate

# Export production environment
export $(cat .env.production | grep -v '^#' | xargs)

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files (if using S3)
python manage.py collectstatic --noinput
```

## Security Checklist

- [ ] Change all default passwords in `.env.production`
- [ ] Generate a new SECRET_KEY for production
- [ ] Remove development IPs from security group before going live
- [ ] Enable SSL/TLS for database connections
- [ ] Set up automated backups (already configured for 7 days)
- [ ] Configure CloudWatch monitoring

## Troubleshooting

### Connection Timeout

```bash
# Check RDS is publicly accessible
aws rds describe-db-instances --db-instance-identifier rentifieddb \
  --query 'DBInstances[0].PubliclyAccessible'

# Check your IP is in security group
aws ec2 describe-security-groups --group-ids sg-03cb50a60f647c825
```

### Authentication Failed

- Verify password in `.env.production`
- Check user exists: `\du` in psql
- Ensure database exists: `\l` in psql

### Database Not Found

Run the setup script: `psql -f scripts/setup_database.sql`

## Production Deployment

1. **EC2/Elastic Beanstalk**: Add their security groups to RDS
2. **Environment Variables**: Set in EB configuration
3. **Static Files**: Configure S3 bucket for static/media
4. **Domain**: Update ALLOWED_HOSTS and CORS settings
5. **SSL**: Configure SSL certificates for HTTPS

## Monitoring

- **Performance Insights**: Already enabled in RDS console
- **CloudWatch**: Set up alarms for:
  - CPU utilization > 80%
  - Database connections > 80
  - Storage space < 10%

## Cost Optimization

- Current instance: `db.t4g.micro` (low cost)
- Consider Aurora Serverless for variable workloads
- Use RDS Proxy for connection pooling in production
- Set up read replicas only when needed

## Backup Strategy

- **Automated**: 7-day retention (configured)
- **Manual**: Before major updates
  ```bash
  aws rds create-db-snapshot \
    --db-instance-identifier rentifieddb \
    --db-snapshot-identifier rentifieddb-backup-$(date +%Y%m%d)
  ```

## Important Files

- `.env.development` - Local SQLite configuration
- `.env.production` - Production RDS configuration
- `scripts/setup_database.sql` - Database initialization
- `test_rds_auto.py` - Automated connection test
- `AURORA_RDS_SETUP.md` - Detailed Aurora documentation
