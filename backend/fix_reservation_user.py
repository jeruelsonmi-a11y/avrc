#!/usr/bin/env python3
"""
Update reservation with correct user who made it
"""
from database import SessionLocal
from models import Reservation, User

def main():
    db = SessionLocal()
    try:
        # Find John Doe (user ID 5)
        john_doe = db.query(User).filter(User.email == 'doe@shc.edu.ph').first()
        
        if not john_doe:
            print("John Doe not found!")
            return
        
        print(f"Found John Doe: ID={john_doe.id}, Name={john_doe.fullname}")
        
        # Update reservation ID 3 to be associated with John Doe
        res = db.query(Reservation).filter(Reservation.id == 3).first()
        
        if not res:
            print("Reservation ID 3 not found!")
            return
        
        print(f"Updating reservation {res.id}...")
        print(f"  From: user_id={res.user_id}")
        res.user_id = john_doe.id
        print(f"  To: user_id={res.user_id}")
        
        db.commit()
        print("✓ Update successful!")
        
        # Verify
        db.refresh(res)
        print(f"✓ Reservation {res.id} now associated with user ID {res.user_id}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
