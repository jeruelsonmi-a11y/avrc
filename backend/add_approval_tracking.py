"""
Database migration script to add approval tracking to reservations
"""
from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        try:
            # Equipment Reservations Table
            print("\n=== Equipment Reservations Table ===")
            
            # Check and add approved_by_id column
            result = conn.execute(text("SHOW COLUMNS FROM equipment_reservations LIKE 'approved_by_id'"))
            if result.fetchone():
                print("✓ approved_by_id column already exists")
            else:
                print("Adding approved_by_id column...")
                conn.execute(text("""
                    ALTER TABLE equipment_reservations 
                    ADD COLUMN approved_by_id INT NULL
                """))
                print("✓ approved_by_id column added successfully")
            
            # Check and add approved_by_name column
            result = conn.execute(text("SHOW COLUMNS FROM equipment_reservations LIKE 'approved_by_name'"))
            if result.fetchone():
                print("✓ approved_by_name column already exists")
            else:
                print("Adding approved_by_name column...")
                conn.execute(text("""
                    ALTER TABLE equipment_reservations 
                    ADD COLUMN approved_by_name VARCHAR(100) NULL
                """))
                print("✓ approved_by_name column added successfully")
            
            # Check and add approved_at column
            result = conn.execute(text("SHOW COLUMNS FROM equipment_reservations LIKE 'approved_at'"))
            if result.fetchone():
                print("✓ approved_at column already exists")
            else:
                print("Adding approved_at column...")
                conn.execute(text("""
                    ALTER TABLE equipment_reservations 
                    ADD COLUMN approved_at DATETIME NULL
                """))
                print("✓ approved_at column added successfully")
            
            # Room Reservations Table
            print("\n=== Room Reservations Table ===")
            
            # Check and add approved_by_id column
            result = conn.execute(text("SHOW COLUMNS FROM room_reservations LIKE 'approved_by_id'"))
            if result.fetchone():
                print("✓ approved_by_id column already exists")
            else:
                print("Adding approved_by_id column...")
                conn.execute(text("""
                    ALTER TABLE room_reservations 
                    ADD COLUMN approved_by_id INT NULL
                """))
                print("✓ approved_by_id column added successfully")
            
            # Check and add approved_by_name column
            result = conn.execute(text("SHOW COLUMNS FROM room_reservations LIKE 'approved_by_name'"))
            if result.fetchone():
                print("✓ approved_by_name column already exists")
            else:
                print("Adding approved_by_name column...")
                conn.execute(text("""
                    ALTER TABLE room_reservations 
                    ADD COLUMN approved_by_name VARCHAR(100) NULL
                """))
                print("✓ approved_by_name column added successfully")
            
            # Check and add approved_at column
            result = conn.execute(text("SHOW COLUMNS FROM room_reservations LIKE 'approved_at'"))
            if result.fetchone():
                print("✓ approved_at column already exists")
            else:
                print("Adding approved_at column...")
                conn.execute(text("""
                    ALTER TABLE room_reservations 
                    ADD COLUMN approved_at DATETIME NULL
                """))
                print("✓ approved_at column added successfully")
            
            conn.commit()
            print("\n✓ All migration steps completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"\n✗ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    migrate()
