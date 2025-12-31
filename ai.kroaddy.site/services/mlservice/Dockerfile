FROM python:3.11-slim

WORKDIR /app

# Java 및 한글 폰트 설치 (konlpy가 Java 필요)
RUN apt-get update && apt-get install -y \
    fonts-nanum \
    fontconfig \
    default-jdk \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

# JAVA_HOME 환경 변수 설정
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# 공통 라이브러리 복사
COPY common /app/common

# 서비스 코드 복사
COPY services/mlservice/app /app/app
COPY services/mlservice/requirements.txt /app/

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 9006

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9006"]
