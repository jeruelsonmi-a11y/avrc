#!/usr/bin/env python3
from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
result = db.execute(text("""
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME='equipment_reservations' 
    ORDER BY ORDINAL_POSITION
"""))

print("📋 Current equipment_reservations columns:")
for row in result:
    print(f"   - {row[0]}: {row[1]}")

db.close()
