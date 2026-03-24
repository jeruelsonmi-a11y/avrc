from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
ALGORITHM = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def truncate_password_to_72_bytes(password: str) -> str:
    """Truncate password to 72 bytes (bcrypt limit) while preserving UTF-8 integrity"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes and decode, ignoring incomplete multi-byte characters
        password_bytes = password_bytes[:72]
        try:
            password = password_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # If we cut in the middle of a multi-byte char, go back one byte at a time
            password = password_bytes.decode('utf-8', errors='ignore')
    return password


def get_password_hash(password: str) -> str:
    # Bcrypt has a 72 byte limit
    password = truncate_password_to_72_bytes(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt has a 72 byte limit
    plain_password = truncate_password_to_72_bytes(plain_password)
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = {"sub": str(subject)}
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[int]:
    try:
        print(f"[DEBUG DECODE] Token: {token[:20]}...")
        print(f"[DEBUG DECODE] SECRET_KEY: {SECRET_KEY[:10]}...")
        print(f"[DEBUG DECODE] ALGORITHM: {ALGORITHM}")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"[DEBUG DECODE] Payload: {payload}")
        user_id: str = payload.get("sub")
        print(f"[DEBUG DECODE] user_id from payload: {user_id}")
        if user_id is None:
            print("[DEBUG DECODE] No 'sub' in payload")
            return None
        result = int(user_id)
        print(f"[DEBUG DECODE] Converted to int: {result}")
        return result
    except Exception as e:
        print(f"[DEBUG DECODE] Exception: {type(e).__name__}: {str(e)}")
        return None
