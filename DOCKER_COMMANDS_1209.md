# Docker & Docker Compose 자주 쓰는 명령어 모음

## 📋 목차
- [로그 확인](#로그-확인)
- [컨테이너 관리](#컨테이너-관리)
- [서비스 시작/중지](#서비스-시작중지)
- [재빌드 및 재시작](#재빌드-및-재시작)
- [컨테이너 내부 접속](#컨테이너-내부-접속)
- [이미지 관리](#이미지-관리)
- [네트워크 관리](#네트워크-관리)
- [디스크 사용량 확인](#디스크-사용량-확인)
- [문제 해결](#문제-해결)

---

## 🔍 로그 확인

### 실시간 로그 보기 (가장 많이 사용)
```bash
# 특정 서비스 로그 실시간 확인
docker-compose logs -f mlservice

# 모든 서비스 로그 실시간 확인
docker-compose logs -f

# docker-compose 없이 사용
docker logs -f mlservice
```

### 최근 로그만 보기
```bash
# 최근 100줄만 보기
docker-compose logs --tail=100 mlservice

# 최근 50줄만 보기
docker-compose logs --tail=50 mlservice
```

### 특정 시간 이후 로그
```bash
# 최근 10분간의 로그
docker-compose logs --since 10m mlservice

# 최근 1시간간의 로그
docker-compose logs --since 1h mlservice

# 특정 시간 이후 로그
docker-compose logs --since 2024-01-01T00:00:00 mlservice
```

### 로그 저장
```bash
# 로그를 파일로 저장
docker-compose logs mlservice > logs.txt

# 특정 시간 이후 로그 저장
docker-compose logs --since 1h mlservice > recent_logs.txt
```

---

## 🐳 컨테이너 관리

### 컨테이너 목록 확인
```bash
# 실행 중인 컨테이너만 보기
docker ps

# 모든 컨테이너 보기 (중지된 것 포함)
docker ps -a

# 컨테이너 목록을 간단하게 보기
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 컨테이너 상태 확인
```bash
# 특정 컨테이너 상세 정보
docker inspect mlservice

# 컨테이너 실행 상태만 확인
docker ps --filter "name=mlservice"
```

### 컨테이너 제어
```bash
# 컨테이너 시작
docker start mlservice

# 컨테이너 중지
docker stop mlservice

# 컨테이너 재시작
docker restart mlservice

# 컨테이너 강제 중지
docker kill mlservice

# 컨테이너 제거 (중지된 것만)
docker rm mlservice

# 실행 중인 컨테이너 강제 제거
docker rm -f mlservice
```

---

## 🚀 서비스 시작/중지

### docker-compose 사용
```bash
# 모든 서비스 시작 (백그라운드)
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d mlservice

# 포그라운드로 실행 (로그가 바로 보임)
docker-compose up mlservice

# 모든 서비스 중지 (컨테이너는 유지)
docker-compose stop

# 특정 서비스만 중지
docker-compose stop mlservice

# 모든 서비스 중지 및 제거
docker-compose down

# 모든 서비스 중지, 제거 및 볼륨까지 삭제
docker-compose down -v

# 모든 서비스 중지, 제거 및 네트워크까지 삭제
docker-compose down --remove-orphans
```

### 서비스 재시작
```bash
# 특정 서비스 재시작
docker-compose restart mlservice

# 모든 서비스 재시작
docker-compose restart
```

---

## 🔨 재빌드 및 재시작

### 재빌드
```bash
# 특정 서비스 재빌드 및 시작
docker-compose up -d --build mlservice

# 모든 서비스 재빌드 및 시작
docker-compose up -d --build

# 캐시 없이 재빌드
docker-compose build --no-cache mlservice
```

### 빠른 재시작 (자주 사용)
```bash
# 컨테이너 중지 → 제거 → 재시작
docker stop mlservice && docker rm mlservice && docker-compose up -d mlservice

# 또는 한 줄로
docker-compose down mlservice && docker-compose up -d --build mlservice
```

---

## 🔧 컨테이너 내부 접속

### Bash/Sh 접속
```bash
# 컨테이너 내부 bash 접속
docker exec -it mlservice /bin/bash

# sh 접속 (bash가 없는 경우)
docker exec -it mlservice /bin/sh

# Python 컨테이너의 경우
docker exec -it mlservice python
```

### 명령어 실행
```bash
# 컨테이너 내부에서 명령어 실행
docker exec mlservice ls -la

# Python 스크립트 실행
docker exec mlservice python app/main.py

# 환경 변수 확인
docker exec mlservice env
```

---

## 🖼️ 이미지 관리

### 이미지 목록
```bash
# 모든 이미지 보기
docker images

# 특정 이미지만 보기
docker images | grep mlservice

# 이미지 상세 정보
docker inspect mlservice-mlservice:latest
```

### 이미지 제거
```bash
# 사용하지 않는 이미지 제거
docker image prune

# 모든 사용하지 않는 이미지 제거 (주의!)
docker image prune -a

# 특정 이미지 제거
docker rmi mlservice-mlservice:latest
```

---

## 🌐 네트워크 관리

### 네트워크 확인
```bash
# 네트워크 목록
docker network ls

# 네트워크 상세 정보
docker network inspect mlservice_mlservice-network
```

### 네트워크 제거
```bash
# 사용하지 않는 네트워크 제거
docker network prune
```

---

## 💾 디스크 사용량 확인

### 디스크 사용량
```bash
# 전체 디스크 사용량 확인
docker system df

# 상세 정보
docker system df -v
```

### 정리 명령어
```bash
# 사용하지 않는 모든 것 정리 (이미지, 컨테이너, 네트워크, 볼륨)
docker system prune

# 볼륨까지 포함해서 정리 (주의!)
docker system prune -a --volumes
```

---

## 🛠️ 문제 해결

### 컨테이너 이름 충돌 해결
```bash
# 기존 컨테이너 강제 제거
docker rm -f mlservice

# 또는 모든 중지된 컨테이너 제거
docker container prune
```

### 포트 충돌 확인
```bash
# 특정 포트 사용 중인 프로세스 확인
netstat -ano | findstr :9006

# 또는 PowerShell에서
Get-NetTCPConnection -LocalPort 9006
```

### 컨테이너 리소스 확인
```bash
# 컨테이너 CPU/메모리 사용량
docker stats mlservice

# 모든 컨테이너 리소스 사용량
docker stats
```

### 환경 변수 확인
```bash
# 컨테이너 환경 변수 확인
docker exec mlservice env

# docker-compose 환경 변수 확인
docker-compose config
```

### 컨테이너 로그 지우기 (주의!)
```bash
# 컨테이너 로그 파일 크기 확인
docker inspect --format='{{.LogPath}}' mlservice

# 로그 파일 삭제 (컨테이너 재시작 필요)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' mlservice)
```

---

## 📝 프로젝트별 특수 명령어

### mlservice 관련
```bash
# mlservice 로그 실시간 확인
docker-compose logs -f mlservice

# mlservice 재빌드 및 재시작
docker stop mlservice && docker rm mlservice && docker-compose up -d --build mlservice

# mlservice 컨테이너 내부 접속
docker exec -it mlservice /bin/bash
```

### 전체 서비스 관리
```bash
# 모든 서비스 한 번에 재시작
docker-compose restart

# 모든 서비스 중지
docker-compose stop

# 모든 서비스 시작
docker-compose start

# 모든 서비스 상태 확인
docker-compose ps
```

---

## 💡 유용한 팁

### 1. 로그 필터링
```bash
# 에러만 보기
docker-compose logs mlservice | grep -i error

# 특정 키워드만 보기
docker-compose logs mlservice | grep "전처리"
```

### 2. 여러 명령어 조합
```bash
# 로그 확인 후 컨테이너 재시작
docker-compose logs --tail=50 mlservice && docker-compose restart mlservice

# 상태 확인 후 로그 보기
docker-compose ps && docker-compose logs -f mlservice
```

### 3. 백그라운드 실행
```bash
# 로그를 파일로 저장하면서 백그라운드 실행
docker-compose up -d mlservice > logs.txt 2>&1 &
```

### 4. 빠른 디버깅
```bash
# 컨테이너 상태 → 로그 → 재시작 (한 줄)
docker ps mlservice && docker-compose logs --tail=20 mlservice && docker-compose restart mlservice
```

---

## ⚠️ 주의사항

1. **`docker system prune -a`**: 사용하지 않는 모든 이미지, 컨테이너, 네트워크를 삭제하므로 주의!
2. **`docker-compose down -v`**: 볼륨까지 삭제하므로 데이터 손실 가능
3. **`docker rm -f`**: 실행 중인 컨테이너를 강제로 제거하므로 데이터 손실 가능
4. **로그 파일**: 로그가 계속 쌓이면 디스크 공간을 많이 차지할 수 있음

---

## 📚 참고

- Docker 공식 문서: https://docs.docker.com/
- Docker Compose 문서: https://docs.docker.com/compose/
- 프로젝트 루트: `C:\Users\hi\Documents\dacon_realreal\kroaddy_project_dacon`

