from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    fullname: str
    email: str
    id_number: str
    department: str
    sub: Optional[str] = None
    password: str

    @validator('password')
    def password_max_length(cls, v):
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password cannot be longer than 72 characters')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

    @validator('email')
    def email_must_be_shc(cls, v):
        if not v.endswith('@shc.edu.ph'):
            raise ValueError('Email must be an @shc.edu.ph address')
        return v

class UserOut(BaseModel):
    id: int
    fullname: str
    email: str
    id_number: str
    department: Optional[str]
    sub: Optional[str]
    role: str = "user"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    fullname: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    department: Optional[str] = None
    sub: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str


class EquipmentCreate(BaseModel):
    name: str
    item_number: str
    available: Optional[bool] = True
    status: Optional[str] = None
    image: Optional[str] = None  # Base64 encoded image


class EquipmentOut(BaseModel):
    id: int
    name: str
    item_number: str
    available: bool
    status: Optional[str] = None
    image: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    item_number: Optional[str] = None
    available: Optional[bool] = None
    status: Optional[str] = None
    image: Optional[str] = None


class RoomCreate(BaseModel):
    name: str
    available: Optional[bool] = True
    image: Optional[str] = None

class RoomOut(BaseModel):
    id: int
    name: str
    available: bool
    image: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    available: Optional[bool] = None
    image: Optional[str] = None


class ReservationCreate(BaseModel):
    item_type: str
    item_id: int
    date_needed: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    purpose: Optional[str] = None


class ReservationUpdate(BaseModel):
    item_type: Optional[str] = None
    item_id: Optional[int] = None
    date_needed: Optional[str] = None
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    purpose: Optional[str] = None
    status: Optional[str] = None
    rejection_reason: Optional[str] = None
    approved_by_name: Optional[str] = None


class ReservationOut(BaseModel):
    id: int
    item_type: str
    item_id: int
    date_needed: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    purpose: Optional[str] = None
    status: str
    user_id: Optional[int] = None
    user: Optional[UserOut] = None
    approved_by_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @validator('status', pre=True, always=True)
    def capitalize_status(cls, v):
        if v is None:
            return v
        try:
            return v.capitalize()
        except Exception:
            return v

    class Config:
        from_attributes = True


class EquipmentReturnCreate(BaseModel):
    equipment_id: int
    condition: str  # 'good', 'damaged', 'maintenance'
    remarks: Optional[str] = None
    new_status: str  # Equipment status after return
    returned_at: Optional[datetime] = None  # When equipment was returned
    reservation_id: Optional[int] = None
    user_id: Optional[int] = None
    username: Optional[str] = None
    equipment_name: Optional[str] = None
    item_number: Optional[str] = None
    department: Optional[str] = None
    id_number: Optional[str] = None


class EquipmentReturnOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    id_number: Optional[str] = None
    department: Optional[str] = None
    new_status: str
    returned_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    remarks: Optional[str] = None
    # Supporting fields
    equipment_id: int
    condition: str
    reservation_id: Optional[int] = None
    equipment_name: Optional[str] = None
    item_number: Optional[str] = None

    class Config:
        from_attributes = True
