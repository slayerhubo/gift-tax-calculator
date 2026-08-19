/**
 * 화면과 format.js를 연결하는 곳.
 * 여기서는 규칙을 만들지 않고, 만들어둔 함수를 갖다 쓰기만 한다.
 */
import { parseAmount, formatWithCommas, toKoreanUnit } from './format.js';

const input = document.querySelector('#amount');
const hint = document.querySelector('#amount-hint');

function update() {
  const amount = parseAmount(input.value);

  // 화면에 보이는 값은 콤마가 들어간 형태로 다시 써준다.
  // ※ 알려진 한계: 글자 중간을 고치면 커서가 맨 뒤로 간다.
  //   금액은 보통 왼쪽에서 오른쪽으로 쭉 치므로 지금은 이대로 둔다.
  input.value = amount === null ? '' : formatWithCommas(amount);

  if (amount === null || amount <= 0) {
    hint.textContent = '금액을 입력해 주세요.';
    hint.classList.remove('is-filled');
    return;
  }

  hint.textContent = toKoreanUnit(amount);
  hint.classList.add('is-filled');
}

input.addEventListener('input', update);
update();   // 첫 화면에서도 안내 문구가 맞게 보이도록 한 번 실행
