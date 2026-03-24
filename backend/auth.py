from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from database import SessionLocal
from models import User, Equipment
from schemas import UserCreate, UserOut, Token, UserUpdate
from utils import get_password_hash, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Prevent registration with admin credentials
    if user.id_number == "admin@shc.edu.ph" or user.email == "admin@shc.edu.ph":
        raise HTTPException(status_code=403, detail="This account is reserved for administrators")
    
    # check if email or id_number exists
    existing = db.query(User).filter((User.email == user.email) | (User.id_number == user.id_number)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or ID number already registered")
    hashed = get_password_hash(user.password)
    # Always create new users as "user" role, never "admin"
    db_user = User(fullname=user.fullname, email=user.email, id_number=user.id_number, department=user.department, sub=user.sub, password_hash=hashed, role="user")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


class LoginRequest(BaseModel):
    id_number: str
    password: str
    
    def dict(self, **kwargs):
        d = super().dict(**kwargs)
        # Truncate password to 72 bytes for bcrypt compatibility
        if len(d['password'].encode('utf-8')) > 72:
            d['password'] = d['password'][:72]
        return d


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    fullname: str
    user_id: int
    role: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id_number == payload.id_number).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token(subject=str(user.id))
    return {"access_token": token, "token_type": "bearer", "fullname": user.fullname, "user_id": user.id, "role": user.role}


@router.get("/user/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/user/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.fullname:
        user.fullname = user_data.fullname
    if user_data.email:
        user.email = user_data.email
    if user_data.id_number:
        user.id_number = user_data.id_number
    if user_data.department:
        user.department = user_data.department
    if user_data.sub is not None:
        user.sub = user_data.sub
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete administrator account")

    try:
        db.delete(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete user because related records exist. Please remove related reservations/returns first."
        )

    return {"detail": "User deleted successfully"}


@router.get("/users", response_model=list[UserOut])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "user").all()
    return users


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    user_count = db.query(User).filter(User.role == "user").count()
    equipment_count = db.query(Equipment).count()
    # import Room lazily to avoid circular import at module load
    from models import Room
    room_count = db.query(Room).count()
    return {
        "total_users": user_count,
        "total_equipment": equipment_count,
        "total_rooms": room_count,
        "pending_reservations": 0  # Placeholder - update when reservations model exists
    }
