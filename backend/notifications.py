from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Notification
from typing import List, Optional
from utils import decode_access_token
from pydantic import BaseModel
from datetime import datetime
from realtime import emit_from_sync

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    """Extract user ID from JWT token in Authorization header"""
    print(f"[DEBUG AUTH] Raw authorization header: {authorization}")
    if not authorization:
        print("[DEBUG AUTH] No authorization header provided")
        return None
    try:
        parts = authorization.split()
        print(f"[DEBUG AUTH] Split parts: {len(parts)} - {parts[0] if parts else 'N/A'}")
        if len(parts) != 2:
            print(f"[DEBUG AUTH] Invalid authorization format: {len(parts)} parts")
            return None
        scheme, token = parts
        print(f"[DEBUG AUTH] Scheme: {scheme}, Token: {token[:20]}...")
        if scheme.lower() != "bearer":
            print(f"[DEBUG AUTH] Invalid scheme: {scheme}")
            return None
        user_id = decode_access_token(token)
        print(f"[DEBUG AUTH] Decoded user_id: {user_id}")
        return user_id
    except Exception as e:
        print(f"[DEBUG AUTH] Error in get_current_user_id: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    reservation_id: Optional[int]
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    type: str
    reservation_id: Optional[int] = None


@router.post("/", response_model=NotificationOut)
def create_notification(notif: NotificationCreate, db: Session = Depends(get_db)):
    """Create a new notification"""
    db_notif = Notification(
        user_id=notif.user_id,
        title=notif.title,
        message=notif.message,
        type=notif.type,
        reservation_id=notif.reservation_id,
        read=False
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)

    emit_from_sync(
        {
            "type": "notification.created",
            "user_id": db_notif.user_id,
            "notification_id": db_notif.id,
        },
        user_id=db_notif.user_id,
    )
    return db_notif


@router.get("/", response_model=List[NotificationOut])
def get_notifications(user_id: Optional[int] = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get all notifications for the current user"""
    if not user_id:
        print("[DEBUG] Authentication failed - no user_id")
        raise HTTPException(status_code=401, detail="Not authenticated - invalid or missing token")
    
    try:
        notifications = db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).all()
        return notifications
    except Exception as e:
        print(f"[DEBUG] Error fetching notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching notifications")


@router.put("/{notif_id}/read")
def mark_as_read(notif_id: int, db: Session = Depends(get_db)):
    """Mark a notification as read"""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()

    emit_from_sync(
        {
            "type": "notification.read",
            "user_id": notif.user_id,
            "notification_id": notif.id,
        },
        user_id=notif.user_id,
    )
    return {"message": "Notification marked as read"}


@router.delete("/{notif_id}")
def delete_notification(notif_id: int, db: Session = Depends(get_db)):
    """Delete a notification"""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    user_id = notif.user_id
    db.delete(notif)
    db.commit()

    emit_from_sync(
        {
            "type": "notification.deleted",
            "user_id": user_id,
            "notification_id": notif_id,
        },
        user_id=user_id,
    )
    return {"message": "Notification deleted"}
