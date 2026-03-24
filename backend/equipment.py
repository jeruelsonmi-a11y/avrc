from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Equipment
from schemas import EquipmentCreate, EquipmentOut, EquipmentUpdate
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/equipment", tags=["equipment"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=EquipmentOut)
def create_equipment(equipment: EquipmentCreate, db: Session = Depends(get_db)):
    # Only reject if an item with the same name *and* number already exists.
    existing = db.query(Equipment).filter(
        Equipment.name == equipment.name,
        Equipment.item_number == equipment.item_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Equipment with that name and item number already exists")
    
    status_value = equipment.status
    if status_value:
        is_available = status_value.strip().lower() == "available"
    else:
        is_available = equipment.available if equipment.available is not None else True
        status_value = "Available" if is_available else "Not Available"

    db_equipment = Equipment(
        name=equipment.name,
        item_number=equipment.item_number,
        available=is_available,
        status=status_value if status_value else None,
        image=equipment.image
    )
    try:
        db.add(db_equipment)
        db.commit()
        db.refresh(db_equipment)
        return db_equipment
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Item number already exists or invalid data")

@router.get("/", response_model=list[EquipmentOut])
def get_all_equipment(db: Session = Depends(get_db)):
    equipment = db.query(Equipment).all()
    return equipment

@router.get("/{equipment_id}", response_model=EquipmentOut)
def get_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment

@router.put("/{equipment_id}", response_model=EquipmentOut)
def update_equipment(equipment_id: int, equipment: EquipmentUpdate, db: Session = Depends(get_db)):
    db_equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # If either name or item_number is being updated, ensure the new
    # combination doesn't collide with an existing row (other than
    # the one we're editing).
    if (equipment.name and equipment.name != db_equipment.name) or \
       (equipment.item_number and equipment.item_number != db_equipment.item_number):
        name_to_check = equipment.name if equipment.name is not None else db_equipment.name
        number_to_check = equipment.item_number if equipment.item_number is not None else db_equipment.item_number
        existing = db.query(Equipment).filter(
            Equipment.name == name_to_check,
            Equipment.item_number == number_to_check,
            Equipment.id != db_equipment.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Equipment with that name and item number already exists")
    
    update_data = equipment.dict(exclude_unset=True)
    
    # If status is provided, derive the available field from it
    # This ensures consistency between status and available fields
    if "status" in update_data:
        status_lower = update_data["status"].strip().lower()
        update_data["available"] = status_lower == "available"
    # If only available is provided without status, derive status from available
    elif "available" in update_data:
        update_data["status"] = "Available" if update_data["available"] else "Not Available"

    for field, value in update_data.items():
        setattr(db_equipment, field, value)
    
    try:
        db.commit()
        db.refresh(db_equipment)
        return db_equipment
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Item number already exists or invalid data")

@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    db_equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    db.delete(db_equipment)
    db.commit()
    return {"message": "Equipment deleted successfully"}
