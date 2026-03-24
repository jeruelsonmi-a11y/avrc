#!/usr/bin/env python3
from sqlalchemy import text
from database import SessionLocal

db = SessionLocal()
try:
    # Check if item_name column exists
    result = db.execute(text("""
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME='room_reservations' AND COLUMN_NAME='item_name'
    """))
    
    column_exists = result.fetchone() is not None
    
    if column_exists:
        print("✅ item_name column already exists")
    else:
        print("📝 Adding item_name column to room_reservations...")
        db.execute(text("""
            ALTER TABLE room_reservations
            ADD COLUMN item_name VARCHAR(255) NULL
        """))
        db.commit()
        print("✅ Successfully added item_name column")
        
except Exception as e:
    print(f"❌ Failed: {e}")
    db.rollback()
finally:
    db.close()
