"""
Script to update equipment categories based on their names
"""
from sqlalchemy import text
from database import engine

def update_categories():
    with engine.connect() as conn:
        try:
            # Update equipment categories based on their names
            updates = [
                ("SPEAKER", "Speaker"),
                ("MICROPHONE", ["Microphone", "Mic"]),
                ("EXTENSION", ["Extension", "Extension Cord", "Cord"]),
                ("TV", "TV"),
                ("FLAG", "Flag"),
                ("HDMI", ["HDMI", "HDMI Cable"]),
            ]
            
            for category, names in updates:
                if isinstance(names, str):
                    names = [names]
                
                for name in names:
                    print(f"Setting category '{category}' for equipment containing '{name}'...")
                    conn.execute(text(f"""
                        UPDATE equipment 
                        SET category = '{category}' 
                        WHERE name LIKE '%{name}%' AND category IS NULL
                    """))
                    print(f"✓ Updated equipment with '{name}'")
            
            conn.commit()
            
            # Display all equipment with their categories
            print("\n=== Current Equipment Categories ===")
            result = conn.execute(text("SELECT id, name, item_number, category FROM equipment"))
            for row in result:
                print(f"ID: {row[0]}, Name: {row[1]}, Item #: {row[2]}, Category: {row[3]}")
            
        except Exception as e:
            print(f"✗ Error: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    update_categories()
    print("\n✓ Category update completed!")
