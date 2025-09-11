# AWS Deployment Guide for My Gaff List

This guide provides step-by-step instructions for deploying the My Gaff List application to AWS.

## 📋 Prerequisites

1. **AWS Account**: Create an AWS account at https://aws.amazon.com
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   brew install awscli
   aws configure
   ```
3. **EB CLI**: Install Elastic Beanstalk CLI
   ```bash
   brew install aws-elasticbeanstalk
   ```
4. **Node.js**: Version 18+ installed
5. **Python**: Version 3.12 installed
6. **Domain Name**: Register a domain (optional but recommended)

## 🚀 Quick Start (Fastest Deployment)

### Option 1: Automated Deployment Script

```bash
# Make the script executable
chmod +x deploy/deploy.sh

# Copy and configure environment variables
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production

# Run deployment
./deploy/deploy.sh production
```

### Option 2: Docker Deployment with App Runner

```bash
# Build and push Docker images
docker build -t mygafflist-backend ./backend
docker build -t mygafflist-frontend ./frontend

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [your-ecr-uri]
docker tag mygafflist-backend:latest [your-ecr-uri]/mygafflist-backend:latest
docker push [your-ecr-uri]/mygafflist-backend:latest

# Deploy with App Runner (via Console or CLI)
```

## 📦 Detailed Deployment Steps

### Step 1: Database Setup (RDS PostgreSQL)

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier mygafflist-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --allocated-storage 20 \
  --master-username postgres \
  --master-user-password [secure-password] \
  --backup-retention-period 7

# Wait for database to be available
aws rds wait db-instance-available --db-instance-identifier mygafflist-db

# Get the endpoint
aws rds describe-db-instances --db-instance-identifier mygafflist-db --query 'DBInstances[0].Endpoint.Address'
```

### Step 2: Backend Deployment (Elastic Beanstalk)

```bash
cd backend

# Initialize Elastic Beanstalk
eb init -p python-3.12 mygafflist-backend --region us-east-1

# Create environment
eb create mygafflist-production --single --instance-type t2.micro

# Set environment variables
eb setenv \
  SECRET_KEY='your-secret-key' \
  DEBUG=False \
  ALLOWED_HOSTS='.elasticbeanstalk.com' \
  DATABASE_URL='postgres://user:pass@rds-endpoint:5432/mygafflist' \
  USE_POSTGRES=True \
  AWS_STORAGE_BUCKET_NAME='mygafflist-media' \
  SENDGRID_API_KEY='your-sendgrid-key' \
  STRIPE_SECRET_KEY='your-stripe-key'

# Deploy
eb deploy

# Run migrations
eb ssh mygafflist-production
source /var/app/venv/*/bin/activate
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
exit
```

### Step 3: Frontend Deployment (AWS Amplify)

```bash
cd frontend

# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init
# Follow prompts:
# - Environment: production
# - Default editor: Visual Studio Code
# - App type: javascript
# - Framework: react
# - Source directory: src
# - Distribution directory: .next
# - Build command: npm run build
# - Start command: npm run start

# Add hosting
amplify add hosting
# Select: Hosting with Amplify Console
# Select: Continuous deployment (GitHub)

# Push to deploy
amplify push
amplify publish
```

### Step 4: S3 Buckets for Static/Media Files

```bash
# Create S3 buckets
aws s3 mb s3://mygafflist-static --region us-east-1
aws s3 mb s3://mygafflist-media --region us-east-1

# Configure bucket policies
aws s3api put-bucket-cors --bucket mygafflist-media --cors-configuration file://deploy/s3-cors.json

# Set public access
aws s3api put-public-access-block \
  --bucket mygafflist-media \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### Step 5: CloudFront CDN Setup

```bash
# Create CloudFront distribution for media files
aws cloudfront create-distribution \
  --origin-domain-name mygafflist-media.s3.amazonaws.com \
  --default-root-object index.html

# Get distribution domain name
aws cloudfront list-distributions --query 'DistributionList.Items[0].DomainName'
```

### Step 6: Redis Setup (ElastiCache)

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id mygafflist-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1

# Get Redis endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id mygafflist-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address'
```

### Step 7: Domain & SSL Configuration

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name mygafflist.com \
  --subject-alternative-names "*.mygafflist.com" \
  --validation-method DNS

# Configure Route 53 (if using AWS for DNS)
# Create hosted zone and update nameservers with your domain registrar
```

## 🔧 Environment Variables

### Backend (.env.production)
```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=.elasticbeanstalk.com,mygafflist.com
DATABASE_URL=postgres://user:pass@rds-endpoint:5432/mygafflist
AWS_STORAGE_BUCKET_NAME=mygafflist-media
REDIS_URL=redis://elasticache-endpoint:6379/0
```

### Frontend (.env.production.local)
```env
NEXT_PUBLIC_API_URL=https://api.mygafflist.com
NEXT_PUBLIC_WS_URL=wss://api.mygafflist.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

## 📊 Monitoring & Maintenance

### View Logs
```bash
# Backend logs
eb logs

# Frontend logs (Amplify Console)
amplify console
```

### Update Deployment
```bash
# Backend
cd backend && eb deploy

# Frontend
cd frontend && amplify push
```

### Database Backup
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier mygafflist-db \
  --db-snapshot-identifier mygafflist-backup-$(date +%Y%m%d)
```

## 💰 Cost Optimization

### Estimated Monthly Costs
- **Elastic Beanstalk** (t2.micro): ~$15
- **RDS** (db.t3.micro): ~$15
- **Amplify Hosting**: ~$5
- **S3 & CloudFront**: ~$5
- **ElastiCache** (cache.t3.micro): ~$13
- **Total**: ~$53/month

### Cost Saving Tips
1. Use Reserved Instances for long-term savings (up to 72% discount)
2. Enable auto-scaling with minimum instances
3. Use S3 Intelligent-Tiering for media files
4. Set up billing alerts

## 🔒 Security Best Practices

1. **Enable MFA** on AWS root account
2. **Use IAM roles** instead of access keys where possible
3. **Encrypt databases** at rest and in transit
4. **Regular security updates**: `eb ssh` and update packages
5. **Enable AWS WAF** for DDoS protection
6. **Use AWS Secrets Manager** for sensitive data
7. **Regular backups** with point-in-time recovery

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check security group allows connection from EB
   - Verify DATABASE_URL is correct

2. **Static Files Not Loading**
   - Run `python manage.py collectstatic`
   - Check S3 bucket permissions

3. **WebSocket Connection Failed**
   - Ensure Application Load Balancer has sticky sessions
   - Check Redis is running and accessible

4. **502 Bad Gateway**
   - Check EB logs: `eb logs`
   - Verify application health: `eb health`

### Useful Commands
```bash
# SSH into EB instance
eb ssh

# Check application status
eb status

# View environment variables
eb printenv

# Restart application
eb restart
```

## 📚 Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

## 🤝 Support

For deployment issues or questions:
1. Check the logs first
2. Review AWS service health dashboard
3. Contact AWS Support if needed

---

**Note**: Remember to keep your production credentials secure and never commit them to version control!