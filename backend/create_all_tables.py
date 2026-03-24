"""
Script to create all database tables including equipment_reservations and room_reservations
"""
from database import engine
from models import Base

if __name__ == "__main__":
    print("Creating all database tables...")
    
    # This creates all tables defined in models.py
    Base.metadata.create_all(bind=engine)
    
    print("✓ All tables created successfully!")
    print("\nTables created:")
    print("  - users")
    print("  - equipment")
    print("  - rooms")
    print("  - reservations")
    print("  - equipment_reservations ← Equipment reservations go here")
    print("  - room_reservations")
    print("  - equipment_returns")
    print("  - notifications")
