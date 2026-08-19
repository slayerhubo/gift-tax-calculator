#!/usr/bin/env bash
# Sprint 1 이슈 일괄 등록 스크립트
#
# 사전 준비:
#   1) gh CLI 설치:  winget install --id GitHub.cli
#   2) 인증:         gh auth login
#   3) 원격 저장소 연결 후 이 스크립트를 저장소 루트에서 실행
#
# 사용: bash scripts/create-issues.sh
set -euo pipefail

MILESTONE="Sprint 1"
DUE="2026-09-01T23:59:59Z"

echo "==> 라벨 생성"
gh label create story  --color 1D76DB --description "사용자 스토리"        --force
gh label create spike  --color 5319E7 --description "조사/학습 티켓"        --force
gh label create must   --color D93F0B --description "이번 스프린트 필수"    --force
gh label create calc   --color 0E8A16 --description "계산 로직"            --force
gh label create ui     --color FBCA04 --description "화면"                 --force
gh label create infra  --color C5DEF5 --description "빌드/배포"            --force
gh label create docs   --color BFD4F2 --description "문서"                 --force

echo "==> 마일스톤 생성"
gh api "repos/{owner}/{repo}/milestones" \
  -f title="$MILESTONE" \
  -f state="open" \
  -f due_on="$DUE" \
  -f description="부모→성인 자녀 현금 증여 1케이스를 계산해 배포한다" \
  >/dev/null 2>&1 || echo "   (이미 존재하거나 건너뜀)"

create() {  # create <id> <title> <labels>
  echo "==> [$1] $2"
  gh issue create \
    --title "[$1] $2" \
    --body-file "docs/issues/$1.md" \
    --label "$3" \
    --milestone "$MILESTONE"
}

create S-01 "세율·공제 기준 조사 (Spike)" "spike,must,docs"
create S-02 "증여금액 입력"                "story,must,ui"
create S-03 "세금 계산 함수"               "story,must,calc"
create S-04 "계산 함수 테스트"             "story,must,calc"
create S-05 "결과 화면"                    "story,must,ui"
create S-06 "면책 문구 + 근거 출처"        "story,must,ui"
create S-07 "GitHub Pages 배포"            "story,must,infra"

echo
echo "==> S-01은 이미 완료됨. 아래 명령으로 닫으세요:"
echo "    gh issue close <S-01 이슈번호> --comment \"조사 완료. 세율·공제 개정 없음. 산출물: src/tax-rules.js\""
