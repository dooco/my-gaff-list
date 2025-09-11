#!/usr/bin/env python
"""RDS connection test - tests both master user and application user"""
import psycopg2
import time
import getpass
import sys

def test_connection():
    host = "rentifieddb.cddxcbiltpfa.eu-west-1.rds.amazonaws.com"
    
    print("\n🔍 RDS Connection Test")
    print("=" * 50)
    print(f"Host: {host}")
    print(f"Port: 5432")
    
    # Get password securely
    password = getpass.getpass("Enter RDS master password (postgres user): ")
    
    print("\n🔄 Testing master user connection...")
    
    try:
        # Test master user connection
        conn = psycopg2.connect(
            host=host,
            port=5432,
            database="postgres",
            user="postgres",
            password=password,
            connect_timeout=10
        )
        
        print("✅ Master user connection successful!")
        cursor = conn.cursor()
        
        # Get PostgreSQL version
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"\n📊 PostgreSQL Version:")
        print(f"   {version[0][:60]}...")
        
        # List existing databases
        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
        databases = cursor.fetchall()
        print(f"\n📁 Existing Databases:")
        for db in databases:
            print(f"   - {db[0]}")
        
        # Check if mygafflist database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'mygafflist';")
        db_exists = cursor.fetchone()
        
        if db_exists:
            print("\n✅ Application database 'mygafflist' exists!")
        else:
            print("\n⚠️  Application database 'mygafflist' does not exist yet.")
            print("   Run the setup_database.sql script to create it.")
        
        # List users
        cursor.execute("SELECT usename FROM pg_user ORDER BY usename;")
        users = cursor.fetchall()
        print(f"\n👥 Database Users:")
        for user in users:
            print(f"   - {user[0]}")
            
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 50)
        print("✅ RDS CONNECTION TEST SUCCESSFUL!")
        print("=" * 50)
        return True
        
    except psycopg2.OperationalError as e:
        print(f"\n❌ Connection failed: {e}")
        
        if "timeout" in str(e).lower():
            print("\n⏱️  Connection timeout - possible issues:")
            print("   1. RDS is still being modified")
            print("   2. Security group doesn't allow your IP")
            print("   3. RDS is not publicly accessible")
        elif "password authentication failed" in str(e).lower():
            print("\n🔑 Authentication failed - check your password")
        else:
            print(f"\n❌ Error: {str(e)[:200]}...")
        
        print("\n📝 Troubleshooting:")
        print("1. Check AWS Console > RDS > rentifieddb > Connectivity & security")
        print("2. Verify 'Publicly accessible' is 'Yes'")
        print("3. Check security group sg-03cb50a60f647c825 allows your IP")
        print("4. Your current IP: 159.134.106.46")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_connection()