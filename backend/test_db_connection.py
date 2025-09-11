#!/usr/bin/env python
import psycopg2
import sys
import os

def test_rds_connection():
    """Test connection to AWS RDS PostgreSQL database"""
    
    # Connection parameters
    host = "rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com"
    port = 5432
    database = "postgres"
    user = "postgres"
    password = input("Enter RDS password: ")
    
    print(f"\n🔍 Testing connection to RDS...")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Database: {database}")
    print(f"   User: {user}")
    
    try:
        # Attempt connection
        print("\n⏳ Attempting to connect...")
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            connect_timeout=10
        )
        
        print("✅ Connection successful!")
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"\n📊 PostgreSQL version: {version[0]}")
        
        # List databases
        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
        databases = cursor.fetchall()
        print("\n📁 Available databases:")
        for db in databases:
            print(f"   - {db[0]}")
        
        cursor.close()
        conn.close()
        
    except psycopg2.OperationalError as e:
        print(f"\n❌ Connection failed: {e}")
        print("\n🔧 Troubleshooting steps:")
        print("   1. Check RDS security group allows your IP")
        print("   2. Verify RDS is publicly accessible (if connecting from local)")
        print("   3. Check VPC and subnet configurations")
        print("   4. Verify credentials are correct")
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_rds_connection()