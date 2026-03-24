from database import SessionLocal
from models import Reservation, User
from sqlalchemy.orm import joinedload

db = SessionLocal()

# Check database directly
print("=== Database Reservations ===")
count = db.query(Reservation).count()
print(f"Total reservations: {count}")

if count > 0:
    reservations = db.query(Reservation).options(joinedload(Reservation.user)).all()
    for r in reservations:
        user_name = r.user.fullname if r.user else "No user"
        print(f"  ID: {r.id}, Type: {r.item_type}, Item: {r.item_id}, Status: {r.status}")
        print(f"    User: {r.user_id} ({user_name})")
        print(f"    Date: {r.date_needed}, Time: {r.time_from} - {r.time_to}")

db.close()
