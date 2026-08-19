/**
 * 증여세 계산 기준 데이터 (Single Source of Truth)
 * =================================================
 * 이 파일은 세법에서 정한 "숫자"만 담는다.
 * 계산 로직(tax-calculator.js)에는 세율·공제 숫자를 절대 직접 쓰지 않는다.
 * 세법이 개정되면 이 파일만 수정하면 되도록 유지할 것.
 *
 * 기준일   : 2026-08-19
 * 조사 티켓 : S-01 (세율·공제 기준 조사 스파이크)
 * 출처     : 국세청 홈택스 개인신고안내 > 증여세
 *   - 항목별 설명(세율·증여재산공제)
 *     https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6533&cntntsId=7960
 *   - 세액계산 흐름도
 *     https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2340&cntntsId=7728
 *   - 신고납부기한
 *     https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2339&cntntsId=7727
 *   - 신고 시 유의사항(신고세액공제·가산세)
 *     https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2342&cntntsId=7730
 *
 * 근거 법령 : 상속세 및 증여세법 제53조(증여재산공제), 제56조(세율), 제69조(신고세액공제)
 *   - 법률     https://www.law.go.kr/법령/상속세및증여세법
 *   - 시행령   https://www.law.go.kr/법령/상속세및증여세법시행령
 *   - 시행규칙 https://www.law.go.kr/법령/상속세및증여세법시행규칙
 *   ※ 위 주소는 항상 "현행" 버전을 가리킨다. 세법 개정 여부를 확인할 때 여기부터 볼 것.
 *   ※ 시행령·시행규칙은 이번 범위(현금 증여 기본 케이스)에서는 쓰이지 않는다.
 *      부동산 평가·부담부증여 등으로 확장할 때 반드시 함께 확인할 것.
 */

export const TAX_RULES_META = {
  기준일: '2026-08-19',
  출처티켓: 'S-01',
  비고: '2026-08-19 국세청 원문 확인 결과 세율·공제 한도 개정 없음(현행 유지).',
};

/**
 * 증여세 세율 (상증법 제56조) — 5단계 초과누진세율
 * 산출세액 = 과세표준 × rate - progressiveDeduction
 *
 * upTo = 해당 구간 과세표준 상한(이하). 마지막 구간은 Infinity.
 */
export const TAX_BRACKETS = [
  { upTo:   100_000_000, rate: 0.10, progressiveDeduction:           0, label: '1억원 이하' },
  { upTo:   500_000_000, rate: 0.20, progressiveDeduction:  10_000_000, label: '1억원 초과 ~ 5억원 이하' },
  { upTo: 1_000_000_000, rate: 0.30, progressiveDeduction:  60_000_000, label: '5억원 초과 ~ 10억원 이하' },
  { upTo: 3_000_000_000, rate: 0.40, progressiveDeduction: 160_000_000, label: '10억원 초과 ~ 30억원 이하' },
  { upTo:      Infinity, rate: 0.50, progressiveDeduction: 460_000_000, label: '30억원 초과' },
];

/**
 * 증여재산공제 (상증법 제53조)
 * ★ 중요: 아래 금액은 "1회"가 아니라 10년간 합산 한도액이다.
 */
export const RELATIONSHIP_DEDUCTIONS = {
  SPOUSE: {
    label: '배우자',
    limit: 600_000_000,
  },
  LINEAL_ASCENDANT: {
    label: '직계존속(부모·조부모)으로부터 받음',
    limit: 50_000_000,
    minorLimit: 20_000_000, // 수증자가 미성년자인 경우
  },
  LINEAL_DESCENDANT: {
    label: '직계비속(자녀·손자녀)으로부터 받음',
    limit: 50_000_000,
  },
  OTHER_RELATIVE: {
    label: '기타 친족(4촌 이내 혈족, 3촌 이내 인척)',
    limit: 10_000_000,
  },
  OTHER: {
    label: '그 밖의 사람(타인)',
    limit: 0,
  },
};

/** 증여재산공제 한도의 합산 기간(년) */
export const DEDUCTION_PERIOD_YEARS = 10;

/** 신고세액공제율 (상증법 제69조) — 기한 내 신고 시 산출세액의 3% 공제 */
export const FILING_TAX_CREDIT_RATE = 0.03;

/** 신고기한: 증여일이 속하는 달의 말일부터 3개월 이내 */
export const FILING_DEADLINE = {
  months: 3,
  description: '증여일이 속하는 달의 말일부터 3개월 이내',
};

/**
 * 세액 절사 단위(원).
 * ※ S-03에서 최종 확정 필요. 우선 1원 단위 버림(Math.floor)으로 두고,
 *   국세청 자동계산 서비스와 대조해 10원 절사 여부를 검증할 것. (S-04 AC)
 */
export const ROUNDING_UNIT = 1;

// ---------------------------------------------------------------------------
// 스프린트 1 범위 밖 — 조사만 해둔 값. 검증 전까지 계산에 사용하지 말 것.
// ---------------------------------------------------------------------------
export const BACKLOG_RULES = {
  가산세: {
    무신고_일반: 0.20,
    무신고_부정: 0.40,
    과소신고_일반: 0.10,
    과소신고_부정: 0.40,
    납부지연_일일: 22 / 100_000, // 미납세액 × 미납일수 × 0.022%
    _출처: '국세청 증여세 신고 시 유의사항 (2026-08-19 확인)',
  },
  세대생략할증: {
    할증률: 0.30,
    _주의: '미성년자 대상 고액 증여 시 할증률이 달라진다는 자료가 있음. 사용 전 원문 재확인 필요.',
  },
  혼인출산증여재산공제: {
    한도: 100_000_000,
    _주의: '국세청 원문에서 미확인. 스프린트 2 착수 시 반드시 원문 재확인 후 사용할 것.',
  },
};
