#!/usr/bin/env python3
"""
Remove the demo/sample data previously inserted by seed_sample_data.py.

How to run (from backend/):
  python purge_sample_data.py

Safety:
  - Targets ONLY the exact demo identifiers created by the seeder (emails, id_numbers,
    room names, equipment item_number prefixes, and explicit "demo data" text).
  - Does not delete the admin account (admin@shc.edu.ph).
"""

from __future__ import annotations

from database import SessionLocal, engine, Base
from models import (
    User,
    Equipment,
    Room,
    EquipmentReservation,
    RoomReservation,
    EquipmentReturn,
    Notification,
)


DEMO_USER_EMAILS = [
    "jeruel.mison@shc.edu.ph",
    "maria.santos@shc.edu.ph",
    "john.delacruz@shc.edu.ph",
    "angelica.reyes@shc.edu.ph",
    "paolo.garcia@shc.edu.ph",
    "kyla.mendoza@shc.edu.ph",
    "mark.villanueva@shc.edu.ph",
    "christine.lopez@shc.edu.ph",
]

DEMO_USER_ID_NUMBERS = [
    "22-0001",
    "22-0002",
    "22-0003",
    "22-0004",
    "22-0005",
    "22-0006",
    "22-0007",
    "22-0008",
]

DEMO_ROOM_NAMES = [
    "Room 101 (AVR)",
    "Room 102 (Conference)",
    "Room 201 (Lecture)",
    "Room 202 (Lab)",
]

# Created by seeder
DEMO_EQUIPMENT_PREFIXES = ("SPK-", "EXT-", "MIC-", "PROJ-", "FLAG-", "TV-", "HDMI-")
DEMO_EQUIPMENT_NAMES = ("Speaker", "Extension Cord", "Microphone", "Projector", "Flag", "TV", "HDMI Cable")


def purge():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Resolve demo users (exclude admin)
        demo_users = (
            db.query(User)
            .filter(
                (User.email.in_(DEMO_USER_EMAILS)) | (User.id_number.in_(DEMO_USER_ID_NUMBERS))
            )
            .filter(User.email != "admin@shc.edu.ph")
            .all()
        )
        demo_user_ids = [u.id for u in demo_users]

        # Resolve demo rooms & equipment
        demo_rooms = db.query(Room).filter(Room.name.in_(DEMO_ROOM_NAMES)).all()
        demo_room_ids = [r.id for r in demo_rooms]

        demo_equipment = (
            db.query(Equipment)
            .filter(
                (Equipment.item_number.like("SPK-%"))
                | (Equipment.item_number.like("EXT-%"))
                | (Equipment.item_number.like("MIC-%"))
                | (Equipment.item_number.like("PROJ-%"))
                | (Equipment.item_number.like("FLAG-%"))
                | (Equipment.item_number.like("TV-%"))
                | (Equipment.item_number.like("HDMI-%"))
            )
            .filter(Equipment.name.in_(DEMO_EQUIPMENT_NAMES))
            .all()
        )
        demo_equipment_ids = [e.id for e in demo_equipment]

        # Delete notifications tied to demo reservations or containing demo text
        # (We delete notifications first to avoid FK issues.)
        notifs_q = db.query(Notification).filter(
            (Notification.user_id.in_(demo_user_ids))
            | (Notification.message.ilike("%demo data%"))
            | (Notification.message.ilike("%(demo data)%"))
        )
        deleted_notifs = notifs_q.delete(synchronize_session=False)

        # Delete equipment returns created by demo reservations or with demo remark
        returns_q = db.query(EquipmentReturn).filter(
            (EquipmentReturn.user_id.in_(demo_user_ids))
            | (EquipmentReturn.remarks.ilike("%demo data%"))
            | (EquipmentReturn.remarks.ilike("%(demo data)%"))
        )
        deleted_returns = returns_q.delete(synchronize_session=False)

        # Delete reservations (equipment + room) made by demo users OR referencing demo items
        eq_res_q = db.query(EquipmentReservation).filter(
            (EquipmentReservation.user_id.in_(demo_user_ids))
            | (EquipmentReservation.item_id.in_(demo_equipment_ids))
            | (EquipmentReservation.purpose.ilike("%demo%"))
        )
        deleted_eq_res = eq_res_q.delete(synchronize_session=False)

        room_res_q = db.query(RoomReservation).filter(
            (RoomReservation.user_id.in_(demo_user_ids))
            | (RoomReservation.item_id.in_(demo_room_ids))
            | (RoomReservation.purpose.ilike("%demo%"))
        )
        deleted_room_res = room_res_q.delete(synchronize_session=False)

        # Delete demo equipment & rooms
        deleted_equipment = (
            db.query(Equipment)
            .filter(Equipment.id.in_(demo_equipment_ids))
            .delete(synchronize_session=False)
        )
        deleted_rooms = (
            db.query(Room)
            .filter(Room.id.in_(demo_room_ids))
            .delete(synchronize_session=False)
        )

        # Delete demo users
        deleted_users = (
            db.query(User)
            .filter(User.id.in_(demo_user_ids))
            .delete(synchronize_session=False)
        )

        db.commit()

        print("OK: Demo/sample data removed.")
        print(f" - Notifications deleted: {deleted_notifs}")
        print(f" - Equipment returns deleted: {deleted_returns}")
        print(f" - Equipment reservations deleted: {deleted_eq_res}")
        print(f" - Room reservations deleted: {deleted_room_res}")
        print(f" - Equipment deleted: {deleted_equipment}")
        print(f" - Rooms deleted: {deleted_rooms}")
        print(f" - Users deleted: {deleted_users}")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Purge failed: {type(e).__name__}: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    purge()

