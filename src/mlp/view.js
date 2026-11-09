import { xorExamples } from './data.js?v=2';

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const format = value => Object.is(value, -0) ? '0' : Number.isInteger(value) ? String(value) : Number(value.toFixed(4)).toString();
export const theoryLink = (section, label = 'Разобрать формулу ↓') => '<a class="mlp-link" href="#' + section + '" data-mlp-section="' + section + '">' + label + '</a>';

export function labView() {
  return `<div class="mlp-lab" data-mlp-lab>
    <header class="mlp-heading"><div><button class="back" data-route="map">← карта</button>
      <h1>Многослойный перцептрон</h1><p>Выбери вход, проследи вычисления и проверь, что меняет нелинейность.</p>
    </div>${theoryLink('mlp-start', 'Как устроена сеть ↓')}</header>
    <div class="mlp-workbench">
      <section class="mlp-network-panel" aria-label="Прямой проход по сети">
        <div class="mlp-examples"><div class="mlp-section-label">Четыре примера XOR <span>y = 1, когда входы различаются</span></div>
          <div class="mlp-example-buttons" role="group" aria-label="Входной пример">${xorExamples.map((e, i) =>
            `<button type="button" data-mlp-example="${i}" aria-pressed="false"><strong>(${e.input.join(', ')})</strong><span>цель ${e.target} · выход <b data-mlp-example-output="${i}"></b></span></button>`).join('')}
          </div>
        </div>
        <div class="mlp-network-head"><strong data-mlp-architecture></strong><span data-mlp-parameter-count></span></div>
        <div class="mlp-network-scroll" tabindex="0" role="region" aria-label="Схема сети; на узком экране прокручивается по горизонтали">
          <svg data-mlp-network role="group" aria-label="Нейроны, связи и смещения сети"></svg>
        </div>
        <div class="mlp-legend"><span><i class="positive"></i>положительное</span><span><i class="negative"></i>отрицательное</span><span><i class="zero"></i>ноль</span><span>Толще связь → больше |w|. Цвет нейрона — знак a.</span></div>
        <p class="mlp-hint">Выбери нейрон, связь или b. С клавиатуры: Tab, затем Enter или пробел.</p>
        <div class="mlp-output"><div><span>Выход сети</span><strong data-mlp-output></strong></div><p data-mlp-result></p></div>
        <div class="mlp-forward-bar"><button class="primary" data-mlp-action="forward">Прямой проход →</button><p role="status" data-mlp-phase>Выбери пример и посмотри на сигналы.</p></div>
      </section>
      <aside class="mlp-side">
        <section class="mlp-settings" aria-label="Архитектура сети"><h2>Архитектура</h2>
          <label>Скрытых слоёв<select name="layers" data-mlp-setting="layers"><option value="0">0 · аффинная модель</option><option value="1">1</option><option value="2">2</option></select></label>
          <div data-mlp-widths></div>
          <fieldset><legend>Активация скрытых слоёв</legend><div class="mlp-activation-choices">
            <button class="secondary" data-mlp-activation="relu" aria-pressed="true">ReLU</button>
            <button class="secondary" data-mlp-activation="identity" aria-pressed="false">Тождественная</button>
          </div></fieldset>
          <p class="mlp-settings-note" data-mlp-activation-note></p>
          <button class="secondary mlp-reset" data-mlp-action="reset">Вернуть пример 2 → 2 → 1</button>
          <p>Коэффициенты заданы заранее. В этой странице сеть не обучается.</p>
          ${theoryLink('mlp-parameters', 'Какие веса у других архитектур? ↓')}
        </section>
        <section class="mlp-inspector" aria-label="Разбор выбранного элемента"><div data-mlp-inspector></div></section>
      </aside>
    </div>
    <section class="mlp-embedded-theory" aria-label="Объяснение архитектуры и нелинейности" data-mlp-reading>
      <p class="mlp-reading-status">Ниже — разбор вычислений, размеров матриц и примера XOR.</p>
      <button class="secondary" data-mlp-action="read">Читать объяснение</button>
    </section>
  </div>`;
}
