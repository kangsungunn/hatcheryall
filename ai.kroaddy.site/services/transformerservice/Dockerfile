FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 설치 (필요한 경우)
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# 서비스 코드 복사
COPY services/transformerservice/app /app/app
COPY services/transformerservice/requirements.txt /app/

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 9007

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9007"]

