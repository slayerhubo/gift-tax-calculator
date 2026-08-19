/**
 * 증여세 계산 함수 테스트 (S-04)
 *
 * 실행: npm test
 *
 * 왜 경계값을 집중적으로 보는가?
 *   버그는 거의 항상 "1억 이하"와 "1억 초과"가 갈리는 지점에서 난다.
 *   그래서 각 구간의 경계에서 -1원 / 정확히 / +1원 을 모두 확인한다.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGiftTax } from '../src/tax-calculator.js';

/** 부모 → 성인 자녀 공제액. 과세표준으로부터 증여가액을 역산할 때 쓴다. */
const 공제 = 50_000_000;

/** 원하는 과세표준이 나오도록 증여가액을 만든다. */
const 증여가액 = (과세표준) => 공제 + 과세표준;

describe('손계산 검증', () => {
  test('3억원 증여 → 납부할 세액 3,880만원', () => {
    // 3억 - 공제 5천만 = 과세표준 2.5억
    // 2.5억 x 20% - 누진공제 1,000만 = 산출세액 4,000만
    // 신고세액공제 4,000만 x 3% = 120만
    // 납부할 세액 = 3,880만
    const r = calculateGiftTax(300_000_000);
    assert.equal(r.과세표준, 250_000_000);
    assert.equal(r.적용세율, 0.20);
    assert.equal(r.산출세액, 40_000_000);
    assert.equal(r.신고세액공제, 1_200_000);
    assert.equal(r.납부할세액, 38_800_000);
  });
});

describe('세율 구간 경계값 (-1원 / 정확히 / +1원)', () => {
  const 경계들 = [
    { 이름: '1억원',  과세표준: 100_000_000,   아래세율: 0.10, 위세율: 0.20 },
    { 이름: '5억원',  과세표준: 500_000_000,   아래세율: 0.20, 위세율: 0.30 },
    { 이름: '10억원', 과세표준: 1_000_000_000, 아래세율: 0.30, 위세율: 0.40 },
    { 이름: '30억원', 과세표준: 3_000_000_000, 아래세율: 0.40, 위세율: 0.50 },
  ];

  for (const { 이름, 과세표준, 아래세율, 위세율 } of 경계들) {
    test(`${이름} 경계에서 세율이 올바르게 갈린다`, () => {
      assert.equal(calculateGiftTax(증여가액(과세표준 - 1)).적용세율, 아래세율);
      assert.equal(calculateGiftTax(증여가액(과세표준)).적용세율,     아래세율, '"이하"이므로 경계값은 아래 구간');
      assert.equal(calculateGiftTax(증여가액(과세표준 + 1)).적용세율, 위세율);
    });

    test(`${이름} 경계에서 세금이 갑자기 뛰지 않는다`, () => {
      const 경계 = calculateGiftTax(증여가액(과세표준)).납부할세액;
      const 한칸위 = calculateGiftTax(증여가액(과세표준 + 1)).납부할세액;
      // 누진공제가 제대로 동작하면 1원 차이로 세금이 튀지 않는다
      assert.ok(한칸위 - 경계 < 100, `경계 ${경계} -> ${한칸위} 로 튐`);
      assert.ok(한칸위 >= 경계, '금액이 늘었는데 세금이 줄면 안 된다');
    });
  }
});

describe('공제로 세금이 사라지는 경우', () => {
  const 케이스 = [
    ['0원',            0],
    ['공제 이하 3천만', 30_000_000],
    ['공제와 동일',     50_000_000],
    ['공제 + 1원',      50_000_001],
  ];

  for (const [이름, 금액] of 케이스) {
    test(`${이름} → 납부할 세액 0원`, () => {
      assert.equal(calculateGiftTax(금액).납부할세액, 0);
    });
  }

  test('공제는 받은 금액보다 커질 수 없다', () => {
    const r = calculateGiftTax(30_000_000);
    assert.equal(r.증여재산공제, 30_000_000);
    assert.equal(r.증여재산공제한도, 50_000_000);
    assert.equal(r.과세표준, 0);
  });
});

describe('최고 구간', () => {
  test('과세표준 100억 → 50% 적용', () => {
    const r = calculateGiftTax(증여가액(10_000_000_000));
    assert.equal(r.적용세율, 0.50);
    assert.equal(r.산출세액, 4_540_000_000);   // 100억 x 50% - 4.6억
    assert.equal(r.납부할세액, 4_403_800_000);
  });
});

describe('끝수 절사 (국고금관리법 제47조)', () => {
  test('납부할 세액의 10원 미만은 버린다', () => {
    // 과세표준 50,000,015 -> 산출 5,000,001 / 신고공제 150,000 -> 4,850,001
    const r = calculateGiftTax(증여가액(50_000_015));
    assert.equal(r.산출세액, 5_000_001);
    assert.equal(r.신고세액공제, 150_000);
    assert.equal(r.납부할세액, 4_850_000, '4,850,001원에서 1원이 절사되어야 한다');
  });

  test('납부할 세액 전액이 10원 미만이면 전액 절사', () => {
    // 과세표준 50원 -> 산출 5원 -> 납부 5원 -> 전액 절사
    const r = calculateGiftTax(증여가액(50));
    assert.equal(r.산출세액, 5);
    assert.equal(r.납부할세액, 0);
  });
});

describe('잘못된 입력', () => {
  test('음수는 거부한다', () => {
    assert.throws(() => calculateGiftTax(-1), TypeError);
  });

  test('숫자가 아니면 거부한다', () => {
    assert.throws(() => calculateGiftTax('금액'), TypeError);
    assert.throws(() => calculateGiftTax(undefined), TypeError);
    assert.throws(() => calculateGiftTax(Infinity), TypeError);
  });

  test('계산 범위를 넘으면 거부한다', () => {
    assert.throws(() => calculateGiftTax(Number.MAX_SAFE_INTEGER), RangeError);
  });
});

describe('순수 함수인지', () => {
  test('같은 입력이면 항상 같은 결과', () => {
    const a = calculateGiftTax(300_000_000);
    const b = calculateGiftTax(300_000_000);
    assert.deepEqual(a, b);
  });

  test('화면(DOM) 없이도 동작한다', () => {
    // node에는 document가 없다. 여기서 테스트가 도는 것 자체가 증거다.
    assert.equal(typeof globalThis.document, 'undefined');
  });
});

/**
 * 완전히 다른 방법으로 계산해서 대조한다.
 *
 * tax-calculator.js는 "누진공제 지름길"을 쓴다:  과세표준 x 세율 - 누진공제액
 * 여기서는 법에 적힌 대로 "구간을 하나씩 쪼개서" 더한다.
 *
 * 두 방법이 항상 같은 값을 내면, 누진공제액 표가 세율표와 아귀가 맞는다는 뜻이다.
 * (누진공제액을 잘못 적어두면 여기서 반드시 걸린다)
 */
import { TAX_BRACKETS } from '../src/tax-rules.js';

function 구간별로쪼개서계산(과세표준) {
  let 세금 = 0;
  let 이전상한 = 0;
  for (const { upTo, rate } of TAX_BRACKETS) {
    if (과세표준 <= 이전상한) break;
    const 이번구간금액 = Math.min(과세표준, upTo) - 이전상한;
    세금 += (이번구간금액 * Math.round(rate * 100)) / 100;
    이전상한 = upTo;
  }
  return Math.floor(세금);
}

describe('교차 검증 — 누진공제 방식 vs 구간별 합산 방식', () => {
  const 검사할과세표준 = [
    0, 1, 100, 99_999_999, 100_000_000, 100_000_001,
    250_000_000, 499_999_999, 500_000_000, 500_000_001,
    999_999_999, 1_000_000_000, 1_000_000_001,
    2_999_999_999, 3_000_000_000, 3_000_000_001,
    5_000_000_000, 10_000_000_000, 50_000_000_000,
  ];

  for (const 과세표준 of 검사할과세표준) {
    test(`과세표준 ${과세표준.toLocaleString('ko-KR')}원`, () => {
      const 지름길 = calculateGiftTax(공제 + 과세표준).산출세액;
      const 정공법 = 구간별로쪼개서계산(과세표준);
      assert.equal(지름길, 정공법,
        `누진공제 방식 ${지름길} != 구간별 합산 ${정공법}`);
    });
  }

  test('무작위 금액 500건도 두 방식이 일치한다', () => {
    for (let i = 0; i < 500; i++) {
      const 과세표준 = Math.floor(Math.random() * 5_000_000_000);
      assert.equal(
        calculateGiftTax(공제 + 과세표준).산출세액,
        구간별로쪼개서계산(과세표준),
        `과세표준 ${과세표준} 에서 불일치`
      );
    }
  });
});
