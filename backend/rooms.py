from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Room
from schemas import RoomCreate, RoomOut, RoomUpdate
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/rooms", tags=["rooms"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=RoomOut)
def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    # check unique name
    existing = db.query(Room).filter(Room.name == room.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Room name already exists")
    db_room = Room(name=room.name, available=room.available, image=room.image)
    try:
        db.add(db_room)
        db.commit()
        db.refresh(db_room)
        return db_room
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Room already exists or invalid data")


@router.get("/", response_model=list[RoomOut])
def get_all_rooms(db: Session = Depends(get_db)):
    return db.query(Room).all()


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.put("/{room_id}", response_model=RoomOut)
def update_room(room_id: int, room: RoomUpdate, db: Session = Depends(get_db)):
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    # name uniqueness
    if room.name and room.name != db_room.name:
        existing = db.query(Room).filter(Room.name == room.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Room name already exists")
    update_data = room.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_room, field, value)
    try:
        db.commit()
        db.refresh(db_room)
        return db_room
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Room name already exists or invalid data")


@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(db_room)
    db.commit()
    return {"message": "Room deleted successfully"}
