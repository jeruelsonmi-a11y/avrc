from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from database import SessionLocal
from models import Reservation, Room, User, Equipment, EquipmentReservation, RoomReservation
from schemas import ReservationCreate, ReservationOut, ReservationUpdate
from typing import List, Optional
from utils import decode_access_token
from realtime import emit_from_sync

router = APIRouter(prefix="/reservations", tags=["reservations"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    """Extract user ID from JWT token in Authorization header"""
    if not authorization:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return decode_access_token(token)
    except Exception:
        return None


@router.post("/", response_model=ReservationOut)
def create_reservation(res: ReservationCreate, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    # Basic overlap check for room reservations
    if res.item_type == 'room' and res.time_from and res.time_to:
        existing = db.query(Reservation).filter(
            Reservation.item_type == 'room',
            Reservation.item_id == res.item_id,
            Reservation.date_needed == res.date_needed
        ).all()
        def to_min(t):
            if not t:
                return None
            hh, mm = map(int, t.split(':'))
            return hh * 60 + mm
        req_s = to_min(res.time_from)
        req_e = to_min(res.time_to)
        for e in existing:
            ex_s = to_min(e.time_from or e.time_to)
            ex_e = to_min(e.time_to or e.time_from)
            if ex_s is None or ex_e is None:
                continue
            if req_s < ex_e and ex_s < req_e:
                raise HTTPException(status_code=400, detail="Time range overlaps existing reservation")

    # persist into dedicated table depending on item_type
    if res.item_type == 'equipment':
        # Get user and equipment info for denormalized fields
        user = db.query(User).filter(User.id == user_id).first()
        equip = db.query(Equipment).filter(Equipment.id == res.item_id).first()
        
        db_res = EquipmentReservation(
            item_id=res.item_id,
            date_needed=res.date_needed,
            time_from=res.time_from or res.time_to,
            purpose=res.purpose,
            status='Pending',
            user_id=user_id,
            # Populate denormalized user fields
            username=user.fullname if user else None,
            id_number=user.id_number if user else None,
            department=user.department if user else None,
            # Populate denormalized equipment field
            item_name=equip.name if equip else None
        )
        db.add(db_res)
        
        # mark equipment as unavailable when reserved
        if equip:
            equip.available = False
            equip.status = 'Not Available'  # Update status field as well
            db.add(equip)
        db.commit()
        db.refresh(db_res)
        db.refresh(db_res, ['user'])
        emit_from_sync(
            {
                "type": "reservation.created",
                "item_type": "equipment",
                "reservation_id": db_res.id,
                "user_id": db_res.user_id,
                "status": db_res.status,
            },
            user_id=db_res.user_id,
        )
        # return a unified shape compatible with ReservationOut
        return {
            'id': db_res.id,
            'item_type': 'equipment',
            'item_id': db_res.item_id,
            'date_needed': db_res.date_needed,
            'time_from': db_res.time_from,
            'time_to': db_res.time_from,
            'purpose': db_res.purpose,
            'status': db_res.status,
            'user_id': db_res.user_id,
            'user': db_res.user,
            'username': db_res.username,
            'id_number': db_res.id_number,
            'department': db_res.department,
            'item_name': db_res.item_name,
            'approved_by_id': None,
            'approved_by_name': None,
            'approved_at': None,
            'created_at': db_res.created_at
        }
    else:
        # Get user and room info for denormalized fields
        user = db.query(User).filter(User.id == user_id).first()
        room = db.query(Room).filter(Room.id == res.item_id).first()
        
        db_res = RoomReservation(
            item_id=res.item_id,
            date_needed=res.date_needed,
            time_from=res.time_from,
            time_to=res.time_to,
            purpose=res.purpose,
            status='Pending',
            user_id=user_id,
            # Populate denormalized user fields
            username=user.fullname if user else None,
            id_number=user.id_number if user else None,
            department=user.department if user else None,
            # Populate denormalized room field
            item_name=room.name if room else None
        )
        db.add(db_res)
        db.commit()
        db.refresh(db_res)
        db.refresh(db_res, ['user'])
        emit_from_sync(
            {
                "type": "reservation.created",
                "item_type": "room",
                "reservation_id": db_res.id,
                "user_id": db_res.user_id,
                "status": db_res.status,
            },
            user_id=db_res.user_id,
        )
        return {
            'id': db_res.id,
            'item_type': 'room',
            'item_id': db_res.item_id,
            'date_needed': db_res.date_needed,
            'time_from': db_res.time_from,
            'time_to': db_res.time_to,
            'purpose': db_res.purpose,
            'status': db_res.status,
            'user_id': db_res.user_id,
            'user': db_res.user,
            'username': db_res.username,
            'id_number': db_res.id_number,
            'department': db_res.department,
            'item_name': db_res.item_name,
            'approved_by_id': None,
            'approved_by_name': None,
            'approved_at': None,
            'created_at': db_res.created_at
        }


@router.put("/{res_id}", response_model=ReservationOut)
def update_reservation(res_id: int, res: ReservationUpdate, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    # try equipment first
    db_res = db.query(EquipmentReservation).options(joinedload(EquipmentReservation.user)).filter(EquipmentReservation.id == res_id).first()
    model_type = 'equipment'
    if not db_res:
        db_res = db.query(RoomReservation).options(joinedload(RoomReservation.user)).filter(RoomReservation.id == res_id).first()
        model_type = 'room' if db_res else None
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    # allow admins to update any reservation
    requesting_user = db.query(User).filter(User.id == user_id).first() if user_id else None
    is_admin = requesting_user and (getattr(requesting_user, 'role', '') or '').lower() == 'admin'
    if not user_id or (db_res.user_id != user_id and not is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to modify this reservation")
    # apply same overlap logic if room
    if res.item_type == 'room' and res.time_from and res.time_to:
        existing = db.query(Reservation).filter(
            Reservation.item_type == 'room',
            Reservation.item_id == res.item_id,
            Reservation.date_needed == res.date_needed,
            Reservation.id != res_id
        ).all()
        def to_min(t):
            if not t:
                return None
            hh, mm = map(int, t.split(':'))
            return hh * 60 + mm
        req_s = to_min(res.time_from)
        req_e = to_min(res.time_to)
        for e in existing:
            ex_s = to_min(e.time_from or e.time_to)
            ex_e = to_min(e.time_to or e.time_from)
            if ex_s is None or ex_e is None:
                continue
            if req_s < ex_e and ex_s < req_e:
                raise HTTPException(status_code=400, detail="Time range overlaps existing reservation")
    update_data = res.dict(exclude_unset=True)
    # Map incoming fields to model columns
    if model_type == 'equipment':
        if 'date_needed' in update_data or 'dateNeeded' in update_data:
            db_res.date_needed = update_data.get('date_needed') or update_data.get('dateNeeded')
        if 'time_from' in update_data or 'timeFrom' in update_data or 'time_needed' in update_data or 'timeNeeded' in update_data:
            # equipment stores single time in time_from
            db_res.time_from = update_data.get('time_from') or update_data.get('timeFrom') or update_data.get('time_needed') or update_data.get('timeNeeded')
        if 'purpose' in update_data:
            db_res.purpose = update_data.get('purpose')
        if 'status' in update_data:
            new_status = update_data.get('status')
            db_res.status = new_status
            # Capture approval info if this is an approval
            if new_status and str(new_status).lower() in ('approved', 'confirmed'):
                db_res.approved_by_id = user_id
                # Use the approver name from request, fallback to requesting user's fullname
                approver_name = update_data.get('approved_by_name') or update_data.get('approvedByName')
                if approver_name:
                    db_res.approved_by_name = approver_name
                elif requesting_user:
                    db_res.approved_by_name = requesting_user.fullname
                db_res.approved_at = func.now()
            # toggle equipment availability based on status
            try:
                equip = db.query(Equipment).filter(Equipment.id == db_res.item_id).first()
                if equip:
                    st = str(update_data.get('status') or '').lower()
                    if st in ('denied', 'cancelled', 'returned'):
                        equip.available = True
                        equip.status = 'Available'
                    else:
                        equip.available = False
                        equip.status = 'Not Available'
                    db.add(equip)
            except Exception:
                pass
    else:
        if 'date_needed' in update_data or 'dateNeeded' in update_data:
            db_res.date_needed = update_data.get('date_needed') or update_data.get('dateNeeded')
        if 'time_from' in update_data or 'timeFrom' in update_data:
            db_res.time_from = update_data.get('time_from') or update_data.get('timeFrom')
        if 'time_to' in update_data or 'timeTo' in update_data:
            db_res.time_to = update_data.get('time_to') or update_data.get('timeTo')
        if 'purpose' in update_data:
            db_res.purpose = update_data.get('purpose')
        if 'status' in update_data:
            new_status = update_data.get('status')
            db_res.status = new_status
            # Capture approval info if this is an approval
            if new_status and str(new_status).lower() in ('approved', 'confirmed'):
                db_res.approved_by_id = user_id
                # Use the approver name from request, fallback to requesting user's fullname
                approver_name = update_data.get('approved_by_name') or update_data.get('approvedByName')
                if approver_name:
                    db_res.approved_by_name = approver_name
                elif requesting_user:
                    db_res.approved_by_name = requesting_user.fullname
                db_res.approved_at = func.now()
    db.commit()
    db.refresh(db_res, ['user'])
    emit_from_sync(
        {
            "type": "reservation.updated",
            "item_type": "equipment" if model_type == "equipment" else "room",
            "reservation_id": db_res.id,
            "user_id": db_res.user_id,
            "status": db_res.status,
        },
        user_id=db_res.user_id,
    )
    # return unified shape
    return {
        'id': db_res.id,
        'item_type': 'equipment' if model_type == 'equipment' else 'room',
        'item_id': db_res.item_id,
        'date_needed': db_res.date_needed,
        'time_from': getattr(db_res, 'time_from', None),
        'time_to': getattr(db_res, 'time_to', getattr(db_res, 'time_from', None)),
        'purpose': db_res.purpose,
        'status': db_res.status,
        'user_id': db_res.user_id,
        'user': db_res.user,
        'approved_by_id': getattr(db_res, 'approved_by_id', None),
        'approved_by_name': getattr(db_res, 'approved_by_name', None),
        'approved_at': getattr(db_res, 'approved_at', None),
        'created_at': db_res.created_at
    }


@router.delete("/{res_id}")
def delete_reservation(res_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    db_res = db.query(EquipmentReservation).filter(EquipmentReservation.id == res_id).first()
    model_type = 'equipment'
    if not db_res:
        db_res = db.query(RoomReservation).filter(RoomReservation.id == res_id).first()
        model_type = 'room' if db_res else None
    if not db_res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    # allow admins to delete any reservation
    requesting_user = db.query(User).filter(User.id == user_id).first() if user_id else None
    is_admin = requesting_user and (getattr(requesting_user, 'role', '') or '').lower() == 'admin'
    if not user_id or (db_res.user_id != user_id and not is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this reservation")
    deleted_user_id = db_res.user_id
    deleted_item_type = "equipment" if model_type == "equipment" else "room"
    db.delete(db_res)
    # if this was an equipment reservation, mark the equipment available again
    if model_type == 'equipment':
        try:
            equip = db.query(Equipment).filter(Equipment.id == db_res.item_id).first()
            if equip:
                equip.available = True
                equip.status = 'Available'
                db.add(equip)
        except Exception:
            pass
    db.commit()
    emit_from_sync(
        {
            "type": "reservation.deleted",
            "item_type": deleted_item_type,
            "reservation_id": res_id,
            "user_id": deleted_user_id,
        },
        user_id=deleted_user_id,
    )
    return {"message": "Reservation deleted"}


@router.get("/availability/{room_id}/{date_needed}")
def get_room_availability(room_id: int, date_needed: str, db: Session = Depends(get_db)):
    """Get reserved time slots for a room on a specific date"""
    try:
        # Query all room reservations for this room on this date
        reservations = db.query(RoomReservation).filter(
            RoomReservation.item_id == room_id,
            RoomReservation.date_needed == date_needed
        ).all()
        
        reserved_slots = []
        for res in reservations:
            if res.time_from and res.time_to:
                reserved_slots.append({
                    'start': res.time_from,
                    'end': res.time_to,
                    'purpose': res.purpose
                })
        
        return {
            'room_id': room_id,
            'date_needed': date_needed,
            'reserved_slots': reserved_slots
        }
    except Exception as e:
        return {
            'room_id': room_id,
            'date_needed': date_needed,
            'reserved_slots': [],
            'error': str(e)
        }


@router.get("/", response_model=List[ReservationOut])
def list_reservations(item_type: Optional[str] = None, item_id: Optional[int] = None, date_needed: Optional[str] = None, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    # If no authenticated user, return empty
    if not user_id:
        return []
    requesting_user = db.query(User).filter(User.id == user_id).first()
    is_admin = requesting_user and (getattr(requesting_user, 'role', '') or '').lower() == 'admin'
    results = []
    if item_type in (None, 'equipment'):
        q = db.query(EquipmentReservation).options(joinedload(EquipmentReservation.user))
        if not is_admin:
            q = q.filter(EquipmentReservation.user_id == user_id)
        if item_id:
            q = q.filter(EquipmentReservation.item_id == item_id)
        if date_needed:
            q = q.filter(EquipmentReservation.date_needed == date_needed)
        for r in q.all():
            results.append({
                'id': r.id,
                'item_type': 'equipment',
                'item_id': r.item_id,
                'date_needed': r.date_needed,
                'time_from': r.time_from,
                'time_to': r.time_from,
                'purpose': r.purpose,
                'status': r.status,
                'user_id': r.user_id,
                'user': r.user,
                'approved_by_id': r.approved_by_id,
                'approved_by_name': r.approved_by_name,
                'approved_at': r.approved_at,
                'created_at': r.created_at
            })
    if item_type in (None, 'room'):
        q = db.query(RoomReservation).options(joinedload(RoomReservation.user))
        if not is_admin:
            q = q.filter(RoomReservation.user_id == user_id)
        if item_id:
            q = q.filter(RoomReservation.item_id == item_id)
        if date_needed:
            q = q.filter(RoomReservation.date_needed == date_needed)
        for r in q.all():
            results.append({
                'id': r.id,
                'item_type': 'room',
                'item_id': r.item_id,
                'date_needed': r.date_needed,
                'time_from': r.time_from,
                'time_to': r.time_to,
                'purpose': r.purpose,
                'status': r.status,
                'user_id': r.user_id,
                'user': r.user,
                'approved_by_id': r.approved_by_id,
                'approved_by_name': r.approved_by_name,
                'approved_at': r.approved_at,
                'created_at': r.created_at
            })
    return results


@router.get("/{res_id}", response_model=ReservationOut)
def get_reservation(res_id: int, db: Session = Depends(get_db), user_id: Optional[int] = Depends(get_current_user_id)):
    r = db.query(EquipmentReservation).options(joinedload(EquipmentReservation.user)).filter(EquipmentReservation.id == res_id).first()
    model_type = 'equipment'
    if not r:
        r = db.query(RoomReservation).options(joinedload(RoomReservation.user)).filter(RoomReservation.id == res_id).first()
        model_type = 'room' if r else None
    if not r:
        raise HTTPException(status_code=404, detail="Reservation not found")
    requesting_user = db.query(User).filter(User.id == user_id).first() if user_id else None
    is_admin = requesting_user and (getattr(requesting_user, 'role', '') or '').lower() == 'admin'
    if not user_id or (r.user_id != user_id and not is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to view this reservation")
    if model_type == 'equipment':
        return {
            'id': r.id,
            'item_type': 'equipment',
            'item_id': r.item_id,
            'date_needed': r.date_needed,
            'time_from': r.time_from,
            'time_to': r.time_from,
            'purpose': r.purpose,
            'status': r.status,
            'user_id': r.user_id,
            'user': r.user,
            'created_at': r.created_at
        }
    else:
        return {
            'id': r.id,
            'item_type': 'room',
            'item_id': r.item_id,
            'date_needed': r.date_needed,
            'time_from': r.time_from,
            'time_to': r.time_to,
            'purpose': r.purpose,
            'status': r.status,
            'user_id': r.user_id,
            'user': r.user,
            'created_at': r.created_at
        }
