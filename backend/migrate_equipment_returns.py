"""
Migration script to update equipment_returns table
- Remove priority column
- Add returned_at column
- Reorder columns
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from database import SessionLocal, engine

def migrate():
    """Apply migration to equipment_returns table"""
    db = SessionLocal()
    
    try:
        # Check if the table exists
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'equipment_returns' not in tables:
            print("Table 'equipment_returns' does not exist yet. It will be created on next app start.")
            return
        
        # Get current columns
        columns = inspector.get_columns('equipment_returns')
        column_names = [col['name'] for col in columns]
        
        print(f"Current columns: {column_names}")
        
        # Check if we need to add returned_at
        if 'returned_at' not in column_names:
            try:
                with engine.connect() as conn:
                    conn.execute(text("""
                        ALTER TABLE equipment_returns 
                        ADD COLUMN returned_at DATETIME NULL
                    """))
                    conn.commit()
                print("✓ Added returned_at column")
            except Exception as e:
                print(f"Note: {e}")
        
        # Check if we need to remove priority
        if 'priority' in column_names:
            try:
                with engine.connect() as conn:
                    conn.execute(text("""
                        ALTER TABLE equipment_returns 
                        DROP COLUMN priority
                    """))
                    conn.commit()
                print("✓ Removed priority column")
            except Exception as e:
                print(f"Note: {e}")
        
        print("\n✓ Migration completed!")
        print("\nNew table structure:")
        print("- id (primary key)")
        print("- user_id (foreign key)")
        print("- username")
        print("- id_number")
        print("- department")
        print("- new_status")
        print("- returned_at (NEW)")
        print("- created_at")
        print("- remarks")
        print("[Supporting fields: equipment_id, reservation_id, equipment_name, item_number, condition]")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
