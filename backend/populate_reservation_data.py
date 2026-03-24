#!/usr/bin/env python3
"""
Script to populate username, id_number, department, and item_name fields
for existing equipment reservations
"""

from database import SessionLocal
from models import EquipmentReservation, User, Equipment

def populate_existing():
    db = SessionLocal()
    try:
        # Find all reservations with NULL values in denormalized fields
        reservations = db.query(EquipmentReservation).filter(
            (EquipmentReservation.username == None) |
            (EquipmentReservation.id_number == None) |
            (EquipmentReservation.department == None) |
            (EquipmentReservation.item_name == None)
        ).all()
        
        if not reservations:
            print("✅ All existing reservations already have user and item info populated")
            return
        
        print(f"📝 Updating {len(reservations)} reservations with missing data...")
        
        updated_count = 0
        for res in reservations:
            # Get user info
            user = db.query(User).filter(User.id == res.user_id).first()
            if user:
                res.username = user.fullname
                res.id_number = user.id_number
                res.department = user.department
            
            # Get equipment info
            equip = db.query(Equipment).filter(Equipment.id == res.item_id).first()
            if equip:
                res.item_name = equip.name
            
            updated_count += 1
        
        db.commit()
        print(f"✅ Successfully updated {updated_count} reservations")
        
        # Show sample
        sample = db.query(EquipmentReservation).limit(3).all()
        print("\n📋 Sample of updated reservations:")
        for res in sample:
            print(f"   ID: {res.id}")
            print(f"      User: {res.username} ({res.id_number}) - {res.department}")
            print(f"      Item: {res.item_name}")
            print()
        
    except Exception as e:
        print(f"❌ Population failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Populating existing reservation data...\n")
    populate_existing()
