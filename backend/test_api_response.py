#!/usr/bin/env python3
"""
Test the API response for reservations
"""
import json
from database import SessionLocal
from models import Reservation
from sqlalchemy.orm import joinedload
from schemas import ReservationOut

def main():
    db = SessionLocal()
    try:
        # Simulate what the API should return
        reservations = db.query(Reservation).options(joinedload(Reservation.user)).all()
        
        print("API Response (serialized JSON):")
        print("=" * 60)
        
        # Serialize using Pydantic
        result = []
        for res in reservations:
            res_dict = ReservationOut.from_orm(res).dict()
            result.append(res_dict)
        
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
