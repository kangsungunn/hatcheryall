from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SexEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"


class EmbarkedEnum(str, Enum):
    SOUTHAMPTON = "S"
    CHERBOURG = "C"
    QUEENSTOWN = "Q"


class Passenger(BaseModel):
    """타이타닉 승객 모델"""
    
    # 기본 정보
    passenger_id: int = Field(..., alias="PassengerId", description="승객 ID")
    survived: int = Field(..., alias="Survived", ge=0, le=1, description="생존 여부 (0=사망, 1=생존)")
    pclass: int = Field(..., alias="Pclass", ge=1, le=3, description="승객 등급 (1, 2, 3)")
    
    # 개인 정보
    name: str = Field(..., alias="Name", description="승객 이름")
    sex: SexEnum = Field(..., alias="Sex", description="성별")
    age: Optional[float] = Field(None, alias="Age", ge=0, le=120, description="나이")
    
    # 가족 정보
    sib_sp: int = Field(..., alias="SibSp", ge=0, description="형제/자매/배우자 수")
    parch: int = Field(..., alias="Parch", ge=0, description="부모/자녀 수")
    
    # 여행 정보
    ticket: str = Field(..., alias="Ticket", description="티켓 번호")
    fare: Optional[float] = Field(None, alias="Fare", ge=0, description="요금")
    cabin: Optional[str] = Field(None, alias="Cabin", description="객실 번호")
    embarked: Optional[EmbarkedEnum] = Field(None, alias="Embarked", description="승선 항구")
    
    class Config:
        """Pydantic 설정"""
        populate_by_name = True  # alias와 필드명 모두 허용 (Pydantic V2)
        use_enum_values = True  # Enum 값을 실제 값으로 사용


class TitanicModels:
    def __init__(self) -> None:
       pass