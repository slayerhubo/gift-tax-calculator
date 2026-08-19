/**
 * 증여세 계산 로직.
 *
 * 규칙 1. 세율·공제 숫자는 여기에 절대 쓰지 않는다. 전부 tax-rules.js에서 가져온다.
 * 규칙 2. 화면(DOM)을 건드리지 않는다. 숫자를 받아 숫자를 돌려줄 뿐이다.
 *         그래야 S-04에서 테스트할 수 있다.
 *
 * 지원 범위(스프린트 1): 부모 → 성인 자녀 현금 증여, 기한 내 신고.
 */
import {
  TAX_BRACKETS,
  RELATIONSHIP_DEDUCTIONS,
  FILING_TAX_CREDIT_RATE,
  TAX_BASE_ROUNDING_UNIT,
  PAYMENT_ROUNDING_UNIT,
} from './tax-rules.js';

/** 이번 스프린트가 지원하는 유일한 관계: 직계존속(부모)으로부터 받음 */
const SUPPORTED_RELATIONSHIP = 'LINEAL_ASCENDANT';

/**
 * 소수 곱셈의 오차를 피하려고 정수로 바꿔서 곱한다.
 *
 * 그냥 곱하면 이런 일이 생긴다:
 *   2999999999 * 0.4  ->  1199999999.6000001   (뒤에 쓰레기 숫자)
 * 정수로 바꿔 곱하면:
 *   (2999999999 * 40) / 100  ->  1199999999.6   (정확)
 *
 * ※ SCALE이 100이므로 세율은 소수점 둘째 자리까지만 지원한다.
 *   현행 세율(10~50%)과 신고세액공제율(3%) 모두 여기 해당한다.
 */
const SCALE = 100;

function multiplyRate(value, rate) {
  return (value * Math.round(rate * SCALE)) / SCALE;
}

/** 절사 단위로 버림. 예) floorTo(38_800_007, 10) -> 38_800_000 */
function floorTo(value, unit) {
  return Math.floor(value / unit) * unit;
}

/** 과세표준이 속하는 세율 구간을 찾는다. */
function findBracket(과세표준) {
  return TAX_BRACKETS.find((bracket) => 과세표준 <= bracket.upTo);
}

/**
 * 증여세를 계산한다.
 *
 * @param {number} 증여재산가액 - 증여받은 금액(원)
 * @returns 계산 단계가 모두 담긴 객체
 */
export function calculateGiftTax(증여재산가액) {
  const 가액 = Number(증여재산가액);

  if (!Number.isFinite(가액) || 가액 < 0) {
    throw new TypeError('증여재산가액은 0 이상의 숫자여야 합니다.');
  }
  // 이 한도를 넘으면 자바스크립트가 정수를 정확히 못 다룬다 (약 90조)
  if (가액 > Number.MAX_SAFE_INTEGER / SCALE) {
    throw new RangeError('계산할 수 있는 범위를 넘는 금액입니다.');
  }

  // 1) 증여재산공제 — 받은 금액보다 클 수는 없으므로 작은 쪽을 쓴다
  const 증여재산공제한도 = RELATIONSHIP_DEDUCTIONS[SUPPORTED_RELATIONSHIP].limit;
  const 증여재산공제 = Math.min(증여재산공제한도, 가액);

  // 2) 과세표준 — 공제가 더 크면 0. 1원 미만 절사(국고금관리법 §47②)
  const 과세표준 = floorTo(가액 - 증여재산공제, TAX_BASE_ROUNDING_UNIT);

  // 3) 세율 구간 찾기
  const 구간 = findBracket(과세표준);

  // 4) 산출세액 = 과세표준 × 세율 - 누진공제액 (계산 과정은 원 단위)
  const 산출세액계산값 = multiplyRate(과세표준, 구간.rate) - 구간.progressiveDeduction;
  const 산출세액 = Math.floor(Math.max(산출세액계산값, 0));

  // 5) 신고세액공제 — 기한 내 신고를 전제로 항상 적용
  const 신고세액공제 = Math.floor(multiplyRate(산출세액, FILING_TAX_CREDIT_RATE));

  // 6) 납부할 세액 — 실제로 국고에 들어가는 돈이라 10원 미만 절사(국고금관리법 §47①)
  //    전액이 10원 미만이면 전액 절사되는 것도 이 계산으로 함께 처리된다.
  const 납부할세액 = floorTo(산출세액 - 신고세액공제, PAYMENT_ROUNDING_UNIT);

  return {
    증여재산가액: 가액,
    증여재산공제,
    증여재산공제한도,
    과세표준,
    적용세율: 구간.rate,
    적용구간: 구간.label,
    누진공제액: 구간.progressiveDeduction,
    산출세액,
    신고세액공제,
    납부할세액,
  };
}
