/**
 * 숫자를 화면에 보여줄 글자로 바꾸는 함수들.
 *
 * 이 파일은 계산을 하지 않는다. 세금 계산은 tax-calculator.js(S-03)가 맡는다.
 * 화면(main.js)을 전혀 건드리지 않으므로, 나중에 테스트하기 쉽다.
 */

/**
 * 사용자가 친 글자에서 숫자만 골라낸다.
 *   "1,234"  -> 1234
 *   "12a3"   -> 123
 *   ""       -> null  (아무것도 안 쳤다는 뜻)
 */
export function parseAmount(text) {
  const digits = String(text).replace(/[^0-9]/g, '');
  if (digits === '') return null;
  return Number(digits);
}

/** 1234567 -> "1,234,567" */
export function formatWithCommas(value) {
  return value.toLocaleString('ko-KR');
}

/** 큰 단위부터 순서대로. 조 = 1억의 1만배. */
const KOREAN_UNITS = [
  { size: 1_0000_0000_0000, name: '조' },
  { size: 1_0000_0000,      name: '억' },
  { size: 1_0000,           name: '만' },
];

/**
 * 숫자를 한글 단위로 읽어준다. "0 하나 더 친" 실수를 잡기 위한 것.
 *   300_000_000 -> "3억원"
 *    50_000_000 -> "5,000만원"
 *   123_456_789 -> "1억 2,345만 6,789원"
 *             0 -> ""
 */
export function toKoreanUnit(value) {
  if (value === null || value <= 0) return '';

  let rest = value;
  const parts = [];

  for (const { size, name } of KOREAN_UNITS) {
    const count = Math.floor(rest / size);
    if (count > 0) {
      parts.push(`${formatWithCommas(count)}${name}`);
      rest -= count * size;
    }
  }

  // 만원 미만으로 남은 금액
  if (rest > 0) parts.push(formatWithCommas(rest));

  return parts.join(' ') + '원';
}
