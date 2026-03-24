"""
Fix missing columns in equipment_returns table
"""
from database import SessionLocal, engine
from sqlalchemy import text

db = SessionLocal()

try:
    # Check current table structure
    result = db.execute(text("DESCRIBE avrc_db.equipment_returns"))
    print("Current columns in equipment_returns:")
    for row in result:
        print(f"  - {row}")
    
    # Add missing columns
    columns_to_add = [
        ("reservation_id", "INT NULL"),
        ("user_id", "INT NULL"),
        ("remarks", "VARCHAR(1024) NULL"),
        ("priority", "VARCHAR(50) NULL"),
    ]
    
    for col_name, col_def in columns_to_add:
        try:
            db.execute(text(f"ALTER TABLE avrc_db.equipment_returns ADD COLUMN {col_name} {col_def}"))
            db.commit()
            print(f"✓ Added column: {col_name}")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e):
                print(f"✓ Column already exists: {col_name}")
            else:
                print(f"✗ Error adding {col_name}: {e}")
    
    # Add foreign key constraints
    try:
        db.execute(text("""
            ALTER TABLE avrc_db.equipment_returns 
            ADD CONSTRAINT fk_equipment_returns_user 
            FOREIGN KEY (user_id) REFERENCES users(id)
        """))
        db.commit()
        print("✓ Added foreign key constraint for user_id")
    except Exception as e:
        if "already exists" in str(e) or "Constraint" in str(e):
            print("✓ Foreign key constraint already exists")
        else:
            print(f"✗ Error adding FK: {e}")
    
    print("\n✓ Table structure fixed!")
    
    # Show updated structure
    result = db.execute(text("DESCRIBE avrc_db.equipment_returns"))
    print("\nUpdated columns in equipment_returns:")
    for row in result:
        print(f"  - {row}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
