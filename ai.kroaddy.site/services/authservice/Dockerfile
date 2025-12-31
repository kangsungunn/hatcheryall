FROM python:3.11-slim

WORKDIR /app

# 공통 라이브러리 복사
COPY common /app/common

# 서비스 코드 복사
COPY services/authservice/app /app/app
COPY services/authservice/requirements.txt /app/

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 9002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9002"]

