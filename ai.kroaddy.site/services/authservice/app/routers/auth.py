from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class AuthRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(request: AuthRequest):
    """AI 인증 로그인"""
    # TODO: 실제 인증 로직 구현
    return {
        "success": True,
        "message": "Login successful",
        "token": "dummy_token"
    }

@router.get("/verify")
async def verify_token(token: str):
    """토큰 검증"""
    # TODO: 실제 토큰 검증 로직 구현
    return {
        "success": True,
        "valid": True
    }

