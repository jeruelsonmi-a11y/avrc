#!/usr/bin/env python3
"""
Script to populate username, id_number, department, and item_name fields
for existing room reservations
"""

from database import SessionLocal
from models import RoomReservation, User, Room

def populate_existing():
    db = SessionLocal()
    try:
        # Find all room reservations with NULL values in denormalized fields
        reservations = db.query(RoomReservation).filter(
            (RoomReservation.username == None) |
            (RoomReservation.id_number == None) |
            (RoomReservation.department == None) |
            (RoomReservation.item_name == None)
        ).all()
        
        if not reservations:
            print("✅ All existing room reservations already have user and room info populated")
            return
        
        print(f"📝 Updating {len(reservations)} room reservations with missing data...")
        
        updated_count = 0
        for res in reservations:
            # Get user info
            user = db.query(User).filter(User.id == res.user_id).first()
            if user:
                res.username = user.fullname
                res.id_number = user.id_number
                res.department = user.department
            
            # Get room info
            room = db.query(Room).filter(Room.id == res.item_id).first()
            if room:
                res.item_name = room.name
            
            updated_count += 1
        
        db.commit()
        print(f"✅ Successfully updated {updated_count} room reservations")
        
        # Show sample
        sample = db.query(RoomReservation).limit(3).all()
        print("\n📋 Sample of updated room reservations:")
        for res in sample:
            print(f"   ID: {res.id}")
            print(f"      User: {res.username} ({res.id_number}) - {res.department}")
            print(f"      Room: {res.item_name}")
            print(f"      Date: {res.date_needed} | Time: {res.time_from} - {res.time_to}")
            print()
        
    except Exception as e:
        print(f"❌ Population failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Populating existing room reservation data...\n")
    populate_existing()
