#!/usr/bin/env python3
"""
Migration script to add username, id_number, department, and item_name columns
to the equipment_reservations table
"""

from sqlalchemy import text
from database import SessionLocal

def migrate():
    db = SessionLocal()
    try:
        # Check if columns already exist
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME='equipment_reservations' AND COLUMN_NAME='username'
        """))
        
        column_exists = result.fetchone() is not None
        
        if column_exists:
            print("✅ Columns already exist in equipment_reservations table")
            return
        
        # Add columns if they don't exist
        print("📝 Adding new columns to equipment_reservations table...")
        
        db.execute(text("""
            ALTER TABLE equipment_reservations
            ADD COLUMN username VARCHAR(100) NULL,
            ADD COLUMN id_number VARCHAR(50) NULL,
            ADD COLUMN department VARCHAR(100) NULL,
            ADD COLUMN item_name VARCHAR(255) NULL
        """))
        
        db.commit()
        print("✅ Successfully added columns: username, id_number, department, item_name")
        
        # Show the updated table structure
        result = db.execute(text("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME='equipment_reservations'
            ORDER BY ORDINAL_POSITION
        """))
        
        print("\n📋 Updated equipment_reservations table structure:")
        for row in result:
            print(f"   {row[0]}: {row[1]} (Nullable: {row[2]})")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Running migration to add reservation fields...")
    migrate()
