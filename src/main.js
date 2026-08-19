/**
 * 화면과 계산 함수를 연결하는 곳.
 * 여기서는 규칙을 만들지 않는다. 만들어둔 함수를 갖다 쓰고, 결과를 화면에 그린다.
 *
 *   format.js         숫자 -> 글자
 *   tax-calculator.js 금액 -> 세금
 *   main.js (여기)    둘을 화면에 연결
 */
import { parseAmount, formatWithCommas, toKoreanUnit } from './format.js';
import { calculateGiftTax } from './tax-calculator.js';

const input = document.querySelector('#amount');
const reading = document.querySelector('#amount-reading');
const ledger = document.querySelector('#ledger-body');

const 원 = (n) => formatWithCommas(n) + '원';

/** 계산 내역 한 줄. op는 왼쪽 여백에 놓이는 연산 기호(-, x, =). */
function row({ op = '', label, sub = '', value, kind = '' }) {
  return `
    <div class="row ${kind}">
      <span class="row__op" aria-hidden="true">${op}</span>
      <span class="row__label">${label}${sub ? `<span class="row__sub">${sub}</span>` : ''}</span>
      <span class="row__value">${value}</span>
    </div>`;
}

function 계산내역그리기(r) {
  // 아직 금액을 안 넣었을 때
  if (r === null) {
    ledger.innerHTML = `<p class="ledger__empty">금액을 입력하면 계산 과정이 여기에 나타납니다.</p>`;
    return;
  }

  const 공제초과 = r.증여재산공제 < r.증여재산공제한도;

  let html = '';
  html += row({ label: '증여재산가액', value: 원(r.증여재산가액) });
  html += row({
    op: '−',
    label: '증여재산공제',
    sub: 공제초과 ? `한도 ${원(r.증여재산공제한도)}` : '부모 → 성년 자녀',
    value: 원(r.증여재산공제),
    kind: 'row--deduct',
  });
  html += row({ op: '=', label: '과세표준', value: 원(r.과세표준), kind: 'row--subtotal' });

  // 공제로 세금이 전부 사라진 경우 — 여기서 끝
  if (r.과세표준 === 0) {
    html += `
      <div class="verdict verdict--none" aria-live="polite">
        <p class="verdict__label">납부할 증여세</p>
        <p class="verdict__amount">없음</p>
        <p class="verdict__why">증여재산공제 안에 들어와 과세표준이 0원입니다.</p>
      </div>`;
    ledger.innerHTML = html;
    return;
  }

  html += row({
    op: '×',
    label: '세율',
    sub: r.적용구간,
    value: `${r.적용세율 * 100}%`,
  });
  if (r.누진공제액 > 0) {
    html += row({ op: '−', label: '누진공제액', value: 원(r.누진공제액), kind: 'row--deduct' });
  }
  html += row({ op: '=', label: '산출세액', value: 원(r.산출세액), kind: 'row--subtotal' });
  html += row({
    op: '−',
    label: '신고세액공제',
    sub: '기한 내 신고 3%',
    value: 원(r.신고세액공제),
    kind: 'row--deduct',
  });

  html += `
    <div class="verdict" aria-live="polite">
      <p class="verdict__label">납부할 세액</p>
      <p class="verdict__amount">${원(r.납부할세액)}</p>
      <p class="verdict__why">${toKoreanUnit(r.납부할세액)}</p>
    </div>`;

  ledger.innerHTML = html;
}

function update() {
  const 금액 = parseAmount(input.value);

  // 화면에 보이는 값은 콤마가 들어간 형태로 다시 써준다.
  // ※ 알려진 한계: 글자 중간을 고치면 커서가 맨 뒤로 간다.
  //   금액은 보통 왼쪽에서 오른쪽으로 쭉 치므로 지금은 이대로 둔다.
  input.value = 금액 === null ? '' : formatWithCommas(금액);

  if (금액 === null || 금액 <= 0) {
    reading.textContent = '금액을 입력해 주세요.';
    reading.classList.remove('is-filled');
    계산내역그리기(null);
    return;
  }

  reading.textContent = toKoreanUnit(금액);
  reading.classList.add('is-filled');

  try {
    계산내역그리기(calculateGiftTax(금액));
  } catch {
    reading.textContent = '계산할 수 있는 범위를 넘는 금액입니다.';
    reading.classList.remove('is-filled');
    계산내역그리기(null);
  }
}

input.addEventListener('input', update);
update();
