"""
Database migration script to update equipment table schema
"""
from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        try:
            # Remove quantity column if it exists
            result = conn.execute(text("SHOW COLUMNS FROM equipment LIKE 'quantity'"))
            if result.fetchone():
                print("Removing quantity column from equipment table...")
                conn.execute(text("ALTER TABLE equipment DROP COLUMN quantity"))
                print("✓ quantity column removed")
            
            # Check if category column exists, add if not
            result = conn.execute(text("SHOW COLUMNS FROM equipment LIKE 'category'"))
            if result.fetchone():
                print("✓ category column already exists")
            else:
                print("Adding category column to equipment table...")
                conn.execute(text("""
                    ALTER TABLE equipment 
                    ADD COLUMN category VARCHAR(100) NULL DEFAULT NULL AFTER item_number
                """))
                print("✓ category column added successfully")
            
            # Check if image column exists
            result = conn.execute(text("SHOW COLUMNS FROM equipment LIKE 'image'"))
            if result.fetchone():
                print("✓ image column already exists")
            else:
                print("Adding image column to equipment table...")
                conn.execute(text("""
                    ALTER TABLE equipment 
                    ADD COLUMN image LONGTEXT NULL
                """))
                print("✓ image column added successfully")

            # Check if status column exists
            result = conn.execute(text("SHOW COLUMNS FROM equipment LIKE 'status'"))
            if result.fetchone():
                print("✓ status column already exists")
            else:
                print("Adding status column to equipment table...")
                conn.execute(text("""
                    ALTER TABLE equipment 
                    ADD COLUMN status VARCHAR(50) NULL DEFAULT 'Available'
                """))
                print("✓ status column added successfully")

            # adjust uniqueness constraints: previous version enforced unique
            # item_number globally, but we now only want item_number unique
            # per equipment name.  remove any existing unique index on the
            # column and add a composite unique index.
            try:
                print("Checking for unique index on item_number...")
                conn.execute(text("ALTER TABLE equipment DROP INDEX item_number"))
                print("✓ dropped old unique index on item_number")
            except Exception:
                pass

            try:
                print("Adding composite unique constraint on name+item_number...")
                conn.execute(text(
                    "ALTER TABLE equipment ADD UNIQUE INDEX uq_equipment_name_item_number (name, item_number)"
                ))
                print("✓ composite unique constraint added")
            except Exception as e:
                print(f"(ignored) {e}")

            # ensure rooms table exists with correct schema
            result = conn.execute(text("SHOW TABLES LIKE 'rooms'"))
            if not result.fetchone():
                print("Creating rooms table...")
                conn.execute(text("""
                    CREATE TABLE rooms (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        image LONGTEXT NULL,
                        available BOOLEAN DEFAULT TRUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                print("✓ rooms table created")
            # ensure reservations table exists
            result = conn.execute(text("SHOW TABLES LIKE 'reservations'"))
            if not result.fetchone():
                print("Creating reservations table...")
                conn.execute(text("""
                    CREATE TABLE reservations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        item_type VARCHAR(50) NOT NULL,
                        item_id INT NOT NULL,
                        date_needed VARCHAR(20) NOT NULL,
                        time_from VARCHAR(10) NULL,
                        time_to VARCHAR(10) NULL,
                        purpose VARCHAR(1024) NULL,
                        status VARCHAR(30) DEFAULT 'Pending',
                        user_id INT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                print("✓ reservations table created")

            conn.commit()
            
        except Exception as e:
            print(f"✗ Migration error: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()
    print("Migration completed!")
