#!/usr/bin/env python
"""Automated RDS connection test using environment variables"""
import psycopg2
import os
import sys
from pathlib import Path

# Load environment variables from .env.production if it exists
env_file = Path(__file__).parent / '.env.production'
if env_file.exists():
    print(f"📁 Loading environment from: {env_file}")
    with open(env_file) as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def test_rds_connection():
    """Test RDS connection using environment variables"""
    
    # Get database configuration from environment
    db_host = os.getenv('DB_HOST', 'rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'mygafflist')
    db_user = os.getenv('DB_USER', 'mygafflist_user')
    db_password = os.getenv('DB_PASSWORD')
    
    print("\n🔍 RDS Connection Test (Automated)")
    print("=" * 60)
    print(f"Host: {db_host}")
    print(f"Port: {db_port}")
    print(f"Database: {db_name}")
    print(f"User: {db_user}")
    print(f"Password: {'*' * len(db_password) if db_password else 'NOT SET'}")
    print("=" * 60)
    
    if not db_password:
        print("\n❌ DB_PASSWORD not set in environment or .env.production")
        print("   Please update .env.production with your database password")
        return False
    
    # Test 1: Connect to postgres database as master user
    print("\n📋 Test 1: Master user connection to postgres database")
    print("-" * 40)
    
    try:
        # Try master user first (postgres)
        master_password = os.getenv('MASTER_PASSWORD')  # Optional master password
        if master_password:
            conn = psycopg2.connect(
                host=db_host,
                port=db_port,
                database="postgres",
                user="postgres",
                password=master_password,
                connect_timeout=10
            )
            print("✅ Master user connection successful")
            
            cursor = conn.cursor()
            cursor.execute("SELECT datname FROM pg_database WHERE datname = %s;", (db_name,))
            if cursor.fetchone():
                print(f"✅ Database '{db_name}' exists")
            else:
                print(f"⚠️  Database '{db_name}' does not exist - creating it...")
                cursor.execute(f"CREATE DATABASE {db_name};")
                print(f"✅ Database '{db_name}' created")
            
            cursor.close()
            conn.close()
        else:
            print("⏭️  Skipping master user test (MASTER_PASSWORD not set)")
    
    except psycopg2.OperationalError as e:
        print(f"⚠️  Master user connection failed: {str(e)[:100]}")
        print("   This is OK if the database already exists")
    
    # Test 2: Connect as application user
    print("\n📋 Test 2: Application user connection")
    print("-" * 40)
    
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            connect_timeout=10
        )
        
        print(f"✅ Connected as {db_user} to {db_name}")
        
        cursor = conn.cursor()
        
        # Get version
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"\n📊 PostgreSQL Version:")
        print(f"   {version[0][:70]}...")
        
        # Check permissions
        cursor.execute("""
            SELECT has_database_privilege(%s, %s, 'CREATE');
        """, (db_user, db_name))
        can_create = cursor.fetchone()[0]
        print(f"\n🔑 User Permissions:")
        print(f"   Can create objects: {'✅ Yes' if can_create else '❌ No'}")
        
        # List tables
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        """)
        tables = cursor.fetchall()
        print(f"\n📊 Tables in {db_name}:")
        if tables:
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("   (No tables yet - run Django migrations)")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✅ RDS CONNECTION TEST SUCCESSFUL!")
        print("=" * 60)
        print("\n📝 Next Steps:")
        print("1. Run Django migrations:")
        print("   python manage.py migrate")
        print("2. Create superuser:")
        print("   python manage.py createsuperuser")
        print("3. Load initial data if needed")
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\n❌ Application user connection failed!")
        print(f"   Error: {str(e)}")
        
        if "password authentication failed" in str(e).lower():
            print("\n🔑 Authentication Issue:")
            print("   1. Check DB_PASSWORD in .env.production")
            print("   2. Verify user exists in database")
            print("   3. Run setup_database.sql script if needed")
        elif "database" in str(e).lower() and "does not exist" in str(e).lower():
            print("\n📁 Database Issue:")
            print(f"   Database '{db_name}' does not exist")
            print("   Run the setup_database.sql script to create it")
        elif "timeout" in str(e).lower():
            print("\n⏱️  Connection Timeout:")
            print("   1. Check if RDS is publicly accessible")
            print("   2. Verify security group allows your IP")
            print("   3. Check network connectivity")
        
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_rds_connection()
    sys.exit(0 if success else 1)