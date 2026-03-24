#!/usr/bin/env python3
"""
Secure script to create an admin account
Run this once to create your admin user
"""

from database import SessionLocal, engine, Base
from models import User
from utils import get_password_hash

def create_admin():
    # Create tables first
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin_exists = db.query(User).filter(
            User.id_number == 'admin@shc.edu.ph'
        ).first()
        
        if admin_exists:
            print("❌ Admin account already exists!")
            return
        
        # Create admin user
        admin_password = "shc@admin"
        hashed_password = get_password_hash(admin_password)
        
        admin_user = User(
            fullname="Admin User",
            email="admin@shc.edu.ph",
            id_number="admin@shc.edu.ph",
            department="Administration",
            password_hash=hashed_password,
            role="admin"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n✅ Admin account created successfully!")
        print("\n📋 Login Credentials:")
        print(f"   ID Number: admin@shc.edu.ph")
        print(f"   Password: shc@admin")
        print(f"   Role: admin")
        print("\n⚠️  IMPORTANT: Change the password after first login!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
