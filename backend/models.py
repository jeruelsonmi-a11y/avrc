from sqlalchemy import Column, Integer, String, DateTime, Boolean, UniqueConstraint, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import Text

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String(255))
    email = Column(String(255), unique=True, index=True, nullable=False)
    id_number = Column(String(100), unique=True, index=True, nullable=False)
    department = Column(String(50))
    sub = Column(String(100), nullable=True)
    password_hash = Column(String(255))
    role = Column(String(20), default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Equipment(Base):
    __tablename__ = "equipment"
    # enforce uniqueness on the combination of name + item_number
    __table_args__ = (
        UniqueConstraint('name', 'item_number', name='uq_equipment_name_item_number'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    # item numbers may repeat across different equipment names, so the
    # unique constraint is handled by the composite above rather than
    # on the column itself.
    item_number = Column(String(100), nullable=False, index=True)
    available = Column(Boolean, default=True)
    status = Column(String(50), nullable=True, default="Available")
    image = Column(Text, nullable=True)  # LONGTEXT for base64 image data
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Room(Base):
    __tablename__ = "rooms"
    # each room name must be unique so users can clearly identify them
    __table_args__ = (
        UniqueConstraint('name', name='uq_rooms_name'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    image = Column(Text, nullable=True)
    available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String(50), nullable=False)  # 'room' or 'equipment'
    item_id = Column(Integer, nullable=False, index=True)
    date_needed = Column(String(20), nullable=False)
    time_from = Column(String(10), nullable=True)
    time_to = Column(String(10), nullable=True)
    purpose = Column(String(1024), nullable=True)
    status = Column(String(30), default='Pending')
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    user = relationship("User", backref="reservations")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EquipmentReservation(Base):
    __tablename__ = "equipment_reservations"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, nullable=False, index=True)
    date_needed = Column(String(20), nullable=False)
    time_from = Column(String(10), nullable=True)
    # equipment reservations do not use time_to
    purpose = Column(String(1024), nullable=True)
    status = Column(String(30), default='Pending')
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    user = relationship("User", backref="equipment_reservations")
    # Denormalized user info for quick display
    username = Column(String(100), nullable=True)  # User's full name
    id_number = Column(String(50), nullable=True)  # User's ID number
    department = Column(String(100), nullable=True)  # User's department
    # Denormalized equipment info for quick display
    item_name = Column(String(255), nullable=True)  # Equipment name
    # Approval tracking
    approved_by_id = Column(Integer, nullable=True)  # Admin who approved
    approved_by_name = Column(String(100), nullable=True)  # Admin's full name
    approved_at = Column(DateTime(timezone=True), nullable=True)  # When it was approved
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RoomReservation(Base):
    __tablename__ = "room_reservations"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, nullable=False, index=True)
    date_needed = Column(String(20), nullable=False)
    time_from = Column(String(10), nullable=True)
    time_to = Column(String(10), nullable=True)
    purpose = Column(String(1024), nullable=True)
    status = Column(String(30), default='Pending')
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    user = relationship("User", backref="room_reservations")
    # Denormalized user info for quick display
    username = Column(String(100), nullable=True)  # User's full name
    id_number = Column(String(50), nullable=True)  # User's ID number
    department = Column(String(100), nullable=True)  # User's department
    # Denormalized room info for quick display
    item_name = Column(String(255), nullable=True)  # Room name
    # Approval tracking
    approved_by_id = Column(Integer, nullable=True)  # Admin who approved
    approved_by_name = Column(String(100), nullable=True)  # Admin's full name
    approved_at = Column(DateTime(timezone=True), nullable=True)  # When it was approved
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1024), nullable=False)
    type = Column(String(50), nullable=False)  # 'approval', 'rejection', 'info', etc.
    reservation_id = Column(Integer, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", backref="notifications")

class EquipmentReturn(Base):
    __tablename__ = "equipment_returns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    username = Column(String(255), nullable=True)
    id_number = Column(String(100), nullable=True)
    department = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)  # Equipment status after return
    returned_at = Column(DateTime(timezone=True), nullable=True)  # When equipment was returned
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    remarks = Column(String(1024), nullable=True)
    # Supporting fields (kept for reference but not in main ordering)
    equipment_id = Column(Integer, ForeignKey('equipment.id'), nullable=False)
    reservation_id = Column(Integer, nullable=True)
    equipment_name = Column(String(255), nullable=True)
    item_number = Column(String(100), nullable=True)
    condition = Column(String(50), nullable=False)  # 'good', 'damaged', 'maintenance'
    equipment = relationship("Equipment", backref="returns")
    user = relationship("User", backref="equipment_returns")
