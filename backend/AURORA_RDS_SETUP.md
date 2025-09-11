# Aurora RDS Database Configuration Guide

## Your Database Details

- **Endpoint**: `rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com`
- **Region**: `eu-west-1` (Ireland)
- **Port**: `5432` (PostgreSQL default)

## Configuration in .env.production

You have two options for configuring the database connection:

### Option 1: Using DATABASE_URL (Recommended)

```env
DATABASE_URL=postgres://USERNAME:PASSWORD@rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com:5432/DATABASE_NAME
```

Example with typical values:
```env
DATABASE_URL=postgres://postgres:MySecurePass123!@rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com:5432/rentifieddb
```

### Option 2: Using Individual Variables

```env
DB_NAME=rentifieddb
DB_USER=postgres
DB_PASSWORD=MySecurePass123!
DB_HOST=rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com
DB_PORT=5432
```

## Getting Your Database Credentials

If you haven't set up the database user yet, connect to your Aurora instance:

```bash
# Using AWS CLI to get master username
aws rds describe-db-clusters \
  --db-cluster-identifier rentifieddb \
  --region eu-west-1 \
  --query 'DBClusters[0].MasterUsername'

# Connect using psql (if you have network access)
psql -h rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com -U postgres -d postgres
```

## Creating Your Application Database

Once connected to Aurora, create your application database:

```sql
-- Create the database
CREATE DATABASE rentifieddb;

-- Create a specific user for the application (optional but recommended)
CREATE USER mygafflist_user WITH PASSWORD 'YourSecurePassword123!';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE rentifieddb TO mygafflist_user;

-- Connect to the new database
\c rentifieddb

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO mygafflist_user;
```

## Testing the Connection

Test your database connection locally:

```python
# test_connection.py
import psycopg2

try:
    connection = psycopg2.connect(
        host="rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com",
        port=5432,
        database="rentifieddb",
        user="your_username",
        password="your_password"
    )
    cursor = connection.cursor()
    cursor.execute("SELECT version();")
    record = cursor.fetchone()
    print("Connected to:", record)
    connection.close()
except Exception as e:
    print("Error:", e)
```

Run:
```bash
python test_connection.py
```

## Security Group Configuration

Ensure your Aurora security group allows connections:

1. **From Elastic Beanstalk**: Add inbound rule for port 5432 from EB security group
2. **From Your IP** (for development): Add your IP temporarily for testing
3. **From Lambda/Other Services**: Add their security groups as needed

```bash
# Get your current IP
curl ifconfig.me

# Update security group (replace sg-xxxxx with your Aurora SG)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr YOUR_IP/32 \
  --region eu-west-1
```

## Django Migration Commands

After setting up your `.env.production`:

```bash
# Export environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Run migrations
python manage.py migrate --settings=my_gaff_list.settings_production

# Create superuser
python manage.py createsuperuser --settings=my_gaff_list.settings_production

# Load initial data
python manage.py load_irish_locations --settings=my_gaff_list.settings_production
```

## Troubleshooting

### Connection Timeout
- Check security group rules
- Verify the endpoint is correct
- Ensure the database is not paused (Aurora Serverless)

### Authentication Failed
- Verify username and password
- Check if user exists in database
- Ensure password doesn't contain special characters that need escaping

### Database Does Not Exist
- Connect as master user and create the database
- Check you're using the correct database name

### SSL Connection Required
Add SSL parameters to DATABASE_URL:
```env
DATABASE_URL=postgres://user:pass@rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com:5432/rentifieddb?sslmode=require
```

## Performance Tips

1. **Connection Pooling**: Use pgbouncer or RDS Proxy for production
2. **Read Replicas**: Configure read replicas for scaling
3. **Parameter Groups**: Optimize PostgreSQL parameters for your workload
4. **Monitoring**: Enable Performance Insights in RDS console

## Backup Strategy

Aurora automatically backs up your data, but you can also:

```bash
# Create manual snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-snapshot-identifier rentifieddb-manual-$(date +%Y%m%d) \
  --db-cluster-identifier rentifieddb \
  --region eu-west-1

# Export to S3
aws rds start-export-task \
  --export-task-identifier rentifieddb-export-$(date +%Y%m%d) \
  --source-arn arn:aws:rds:eu-west-1:YOUR_ACCOUNT:cluster:rentifieddb \
  --s3-bucket-name your-backup-bucket \
  --iam-role-arn arn:aws:iam::YOUR_ACCOUNT:role/rds-export-role \
  --region eu-west-1
```

## Important Notes

1. **Never commit** `.env.production` to git
2. **Use strong passwords** with mixed case, numbers, and symbols
3. **Rotate credentials** regularly
4. **Monitor costs** - Aurora can be expensive if not configured properly
5. **Enable encryption** at rest if handling sensitive data