from pydantic_settings import BaseSettings

class BaseServiceConfig(BaseSettings):
    service_name: str
    service_version: str = "1.0.0"
    debug: bool = False
    
    class Config:
        env_file = ".env"

