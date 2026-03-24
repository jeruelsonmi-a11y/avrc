#!/usr/bin/env python3
"""
Migration script to update existing reservations with user_id
"""
from database import SessionLocal
from models import Reservation, User

def main():
    db = SessionLocal()
    try:
        # Find all reservations without user_id
        reservations = db.query(Reservation).filter(
            (Reservation.user_id == None) | (Reservation.user_id == 0)
        ).all()
        
        if not reservations:
            print("No reservations without user_id found!")
            return
        
        # Get first available user
        user = db.query(User).first()
        if not user:
            print("No users found in database!")
            return
        
        print(f"Found {len(reservations)} reservations without user_id")
        print(f"Updating them to user_id={user.id} ({user.fullname})")
        
        # Update all reservations without user_id
        for res in reservations:
            print(f"  Updating reservation {res.id}...")
            res.user_id = user.id
        
        db.commit()
        print("✓ Migration completed successfully!")
        
        # Verify
        updated = db.query(Reservation).filter(Reservation.user_id == user.id).all()
        print(f"✓ Total reservations for user {user.fullname}: {len(updated)}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
