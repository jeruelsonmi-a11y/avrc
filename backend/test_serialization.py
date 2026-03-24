import json
from database import SessionLocal
from models import Reservation, User
from sqlalchemy.orm import joinedload
from schemas import ReservationOut

db = SessionLocal()

# Get all reservations with joined user data
reservations = db.query(Reservation).options(joinedload(Reservation.user)).all()

print(f"Found {len(reservations)} reservations in DB")

# Try to convert to ReservationOut schema (this is what the API does)
try:
    response_data = []
    for r in reservations:
        # This simulates what pydantic does when serializing
        out = ReservationOut.from_orm(r)
        response_data.append(out)
    
    # Convert to JSON to see what the API would return
    json_response = json.dumps([r.dict() for r in response_data], indent=2, default=str)
    print("\n=== API Response (JSON) ===")
    print(json_response)
except Exception as e:
    print(f"Error converting to ReservationOut: {e}")
    import traceback
    traceback.print_exc()

db.close()
