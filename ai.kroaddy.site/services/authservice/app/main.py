from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.config import BaseServiceConfig
from common.middleware import LoggingMiddleware
from .routers import auth

app = FastAPI(title="Auth Service", version="1.0.0")

# 공통 미들웨어 추가
app.add_middleware(LoggingMiddleware)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 추가
app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/")
async def root():
    return {
        "service": "Auth Service",
        "status": "running",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)

