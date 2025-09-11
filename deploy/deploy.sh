#!/bin/bash

# AWS Deployment Script for My Gaff List
# This script automates the deployment process to AWS

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mygafflist"
AWS_REGION="us-east-1"
ENVIRONMENT="${1:-production}"

echo -e "${GREEN}Starting deployment for ${PROJECT_NAME} - Environment: ${ENVIRONMENT}${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check EB CLI
    if ! command -v eb &> /dev/null; then
        echo -e "${RED}EB CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker is installed (optional)${NC}"
    fi
    
    echo -e "${GREEN}All prerequisites are met!${NC}"
}

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}Deploying backend to Elastic Beanstalk...${NC}"
    
    cd backend
    
    # Initialize EB if not already done
    if [ ! -d ".elasticbeanstalk" ]; then
        eb init -p python-3.12 ${PROJECT_NAME}-backend --region ${AWS_REGION}
    fi
    
    # Create or update environment
    if eb list | grep -q "${PROJECT_NAME}-${ENVIRONMENT}"; then
        echo "Updating existing environment..."
        eb deploy ${PROJECT_NAME}-${ENVIRONMENT}
    else
        echo "Creating new environment..."
        eb create ${PROJECT_NAME}-${ENVIRONMENT} \
            --single \
            --instance-type t2.micro \
            --envvars SECRET_KEY=${SECRET_KEY},DEBUG=False,USE_POSTGRES=True
    fi
    
    # Run post-deployment tasks
    eb ssh ${PROJECT_NAME}-${ENVIRONMENT} --command "source /var/app/venv/*/bin/activate && python manage.py migrate"
    
    cd ..
    echo -e "${GREEN}Backend deployment complete!${NC}"
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}Deploying frontend to Amplify...${NC}"
    
    cd frontend
    
    # Build production version
    npm run build
    
    # Deploy to Amplify (assuming Amplify is already configured)
    if [ -d "amplify" ]; then
        amplify push --yes
    else
        echo -e "${YELLOW}Amplify not configured. Please run 'amplify init' first.${NC}"
    fi
    
    cd ..
    echo -e "${GREEN}Frontend deployment complete!${NC}"
}

# Function to setup S3 buckets
setup_s3() {
    echo -e "${YELLOW}Setting up S3 buckets...${NC}"
    
    # Create media bucket
    aws s3api create-bucket \
        --bucket ${PROJECT_NAME}-media \
        --region ${AWS_REGION} \
        2>/dev/null || echo "Media bucket already exists"
    
    # Create static bucket
    aws s3api create-bucket \
        --bucket ${PROJECT_NAME}-static \
        --region ${AWS_REGION} \
        2>/dev/null || echo "Static bucket already exists"
    
    # Set bucket policies
    aws s3api put-bucket-cors \
        --bucket ${PROJECT_NAME}-media \
        --cors-configuration file://deploy/s3-cors.json
    
    echo -e "${GREEN}S3 setup complete!${NC}"
}

# Function to setup RDS database
setup_database() {
    echo -e "${YELLOW}Setting up RDS database...${NC}"
    
    # Check if database already exists
    if aws rds describe-db-instances --db-instance-identifier ${PROJECT_NAME}-db &>/dev/null; then
        echo "Database already exists"
    else
        aws rds create-db-instance \
            --db-instance-identifier ${PROJECT_NAME}-db \
            --db-instance-class db.t3.micro \
            --engine postgres \
            --engine-version 15.4 \
            --allocated-storage 20 \
            --storage-encrypted \
            --master-username postgres \
            --master-user-password ${DB_PASSWORD} \
            --backup-retention-period 7 \
            --preferred-backup-window "03:00-04:00" \
            --preferred-maintenance-window "sun:04:00-sun:05:00" \
            --no-publicly-accessible
        
        echo "Waiting for database to be available..."
        aws rds wait db-instance-available --db-instance-identifier ${PROJECT_NAME}-db
    fi
    
    echo -e "${GREEN}Database setup complete!${NC}"
}

# Function to setup CloudFront
setup_cloudfront() {
    echo -e "${YELLOW}Setting up CloudFront distribution...${NC}"
    
    aws cloudfront create-distribution \
        --distribution-config file://deploy/cloudfront-config.json \
        2>/dev/null || echo "CloudFront distribution may already exist"
    
    echo -e "${GREEN}CloudFront setup complete!${NC}"
}

# Main deployment flow
main() {
    check_prerequisites
    
    # Load environment variables
    if [ -f ".env.${ENVIRONMENT}" ]; then
        export $(cat .env.${ENVIRONMENT} | xargs)
    else
        echo -e "${RED}Environment file .env.${ENVIRONMENT} not found!${NC}"
        exit 1
    fi
    
    # Run deployment steps
    setup_s3
    setup_database
    deploy_backend
    deploy_frontend
    setup_cloudfront
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${YELLOW}Please update your DNS records to point to the new services.${NC}"
}

# Run main function
main