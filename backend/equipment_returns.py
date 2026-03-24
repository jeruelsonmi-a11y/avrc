from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import EquipmentReturn, Equipment, User
from schemas import EquipmentReturnCreate, EquipmentReturnOut
from datetime import datetime
import logging
from realtime import emit_from_sync

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/equipment-returns", tags=["equipment-returns"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=EquipmentReturnOut)
def create_equipment_return(return_data: EquipmentReturnCreate, db: Session = Depends(get_db)):
    """Create a new equipment return record"""
    try:
        logger.info(f"Creating equipment return: equipment_id={return_data.equipment_id}, condition={return_data.condition}")
        
        # Verify equipment exists
        equipment = db.query(Equipment).filter(Equipment.id == return_data.equipment_id).first()
        if not equipment:
            logger.warning(f"Equipment not found: {return_data.equipment_id}")
            raise HTTPException(status_code=404, detail="Equipment not found")
        
        # Fetch user data if user_id is provided
        username = return_data.username
        department = return_data.department
        id_number = return_data.id_number
        
        if return_data.user_id:
            user = db.query(User).filter(User.id == return_data.user_id).first()
            if user:
                username = user.fullname
                department = user.department
                id_number = user.id_number
        
        db_return = EquipmentReturn(
            equipment_id=return_data.equipment_id,
            condition=return_data.condition,
            remarks=return_data.remarks,
            new_status=return_data.new_status,
            returned_at=return_data.returned_at or datetime.now(),
            reservation_id=return_data.reservation_id,
            user_id=return_data.user_id,
            username=username,
            equipment_name=return_data.equipment_name or equipment.name,
            item_number=return_data.item_number or equipment.item_number,
            department=department,
            id_number=id_number
        )
        
        db.add(db_return)
        db.commit()
        db.refresh(db_return)
        
        # Automatically update equipment status based on return status
        status_mapping = {
            "damaged": "for repair",
            "need maintenance": "under maintenance"
        }
        
        status_lower = return_data.new_status.lower()
        if status_lower in status_mapping:
            equipment.status = status_mapping[status_lower]
            equipment.available = False
            logger.info(f"✓ Equipment {equipment.name} status auto-updated to '{equipment.status}'")
        
        db.commit()
        logger.info(f"✓ Equipment return saved successfully: ID={db_return.id}, user={username}, equipment={equipment.name}")

        emit_from_sync(
            {
                "type": "equipment_return.created",
                "return_id": db_return.id,
                "user_id": db_return.user_id,
                "reservation_id": db_return.reservation_id,
                "equipment_id": db_return.equipment_id,
            },
            user_id=db_return.user_id if db_return.user_id else None,
        )
        return db_return
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"✗ Error creating equipment return: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error creating equipment return: {str(e)}")


@router.get("/", response_model=list[EquipmentReturnOut])
def get_all_equipment_returns(db: Session = Depends(get_db)):
    """Get all equipment returns, ordered by most recent first"""
    try:
        returns = db.query(EquipmentReturn).order_by(EquipmentReturn.created_at.desc()).all()
        logger.info(f"Retrieved {len(returns)} equipment returns from database")
        return returns
    except Exception as e:
        logger.error(f"Error fetching equipment returns: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error fetching returns: {str(e)}")


@router.get("/{return_id}", response_model=EquipmentReturnOut)
def get_equipment_return(return_id: int, db: Session = Depends(get_db)):
    """Get a specific equipment return by ID"""
    equipment_return = db.query(EquipmentReturn).filter(EquipmentReturn.id == return_id).first()
    if not equipment_return:
        raise HTTPException(status_code=404, detail="Equipment return not found")
    return equipment_return


@router.get("/equipment/{equipment_id}", response_model=list[EquipmentReturnOut])
def get_equipment_returns_by_equipment(equipment_id: int, db: Session = Depends(get_db)):
    """Get all returns for a specific equipment"""
    returns = db.query(EquipmentReturn).filter(
        EquipmentReturn.equipment_id == equipment_id
    ).order_by(EquipmentReturn.created_at.desc()).all()
    return returns


@router.put("/{return_id}/remarks", response_model=EquipmentReturnOut)
def update_equipment_return_remarks(return_id: int, remarks: dict, db: Session = Depends(get_db)):
    """Update admin remarks for an equipment return"""
    try:
        equipment_return = db.query(EquipmentReturn).filter(EquipmentReturn.id == return_id).first()
        if not equipment_return:
            raise HTTPException(status_code=404, detail="Equipment return not found")
        
        # Update remarks
        new_remarks = remarks.get("remarks", "")
        equipment_return.remarks = new_remarks
        
        db.commit()
        db.refresh(equipment_return)
        logger.info(f"✓ Updated remarks for equipment return ID={return_id}: {new_remarks[:50]}...")
        return equipment_return
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"✗ Error updating remarks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error updating remarks: {str(e)}")
