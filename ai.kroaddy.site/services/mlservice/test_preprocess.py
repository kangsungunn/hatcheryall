#!/usr/bin/env python3
"""
전처리 함수를 직접 실행하는 테스트 스크립트
터미널에서 직접 실행하여 로그 확인 가능
"""
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / 'app'))

from app.titanic.titanic_service import TitanicService

if __name__ == "__main__":
    print("=" * 80)
    print("전처리 테스트 시작")
    print("=" * 80)
    
    service = TitanicService()
    result = service.preprocess()
    
    print("\n" + "=" * 80)
    print("전처리 결과:")
    print("=" * 80)
    print(f"Status: {result.get('status')}")
    print(f"Message: {result.get('message')}")
    
    if result.get('status') == 'success':
        data = result.get('data', {})
        before = data.get('before_preprocessing', {})
        after = data.get('after_preprocessing', {})
        changes = data.get('changes', {})
        
        print(f"\n전처리 전: {before.get('column_count')}개 컬럼, {before.get('null_count')}개 결측치")
        print(f"전처리 후: {after.get('column_count')}개 컬럼, {after.get('null_count')}개 결측치")
        print(f"변화: {changes.get('columns_removed')}개 제거, {changes.get('columns_added')}개 추가")

