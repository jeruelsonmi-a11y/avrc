#!/usr/bin/env python3
"""
Check existing reservations and their user data
"""
from database import SessionLocal
from models import Reservation, User
from sqlalchemy.orm import joinedload

def main():
    db = SessionLocal()
    try:
        # Get all reservations with user data
        reservations = db.query(Reservation).options(joinedload(Reservation.user)).all()
        
        print(f"Total reservations: {len(reservations)}")
        print()
        
        for res in reservations:
            print(f"Reservation ID: {res.id}")
            print(f"  Item Type: {res.item_type}")
            print(f"  Item ID: {res.item_id}")
            print(f"  User ID: {res.user_id}")
            print(f"  Status: {res.status}")
            if res.user:
                print(f"  User: {res.user.fullname} ({res.user.email})")
                print(f"  Department: {res.user.department}")
            else:
                print(f"  User: <NOT FOUND>")
            print()
        
        # Also check all users
        print("\n--- All Users in Database ---")
        users = db.query(User).all()
        for user in users:
            print(f"ID: {user.id}, Name: {user.fullname}, Email: {user.email}, Dept: {user.department}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
