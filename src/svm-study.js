const tasks = [
  {
    "title": "От оценки к классу",
    "question": "Даны w = (2, −1), b = −1. Найдите f(x) для x = (2, 1). Какой класс предскажет SVM? А для точки z = (0, 2)? Введите оценку f(x) первой точки.",
    "hint": "Скалярное произведение: wᵀx = w₁x₁ + w₂x₂. Затем прибавьте b.",
    "solution": "Для x: f(x) = 2·2 − 1·1 − 1 = 2, класс +1. Для z: f(z) = 0 − 2 − 1 = −3, класс −1. Эти числа — оценки, а не вероятности.",
    "answer": 2
  },
  {
    "title": "Посчитать ширину зазора",
    "question": "Пусть w = (3, 4), а стороны зазора заданы f(x) = ±1. Чему равна полная ширина полосы? Дополнительно найдите расстояние до границы для точки с f(x) = −2.",
    "hint": "Сначала найдите евклидову норму w. Полная ширина — 2/‖w‖, расстояние точки — |f(x)|/‖w‖.",
    "solution": "‖w‖ = √(9 + 16) = 5. Полная ширина: 2/5 = 0,4. Расстояние точки: |−2|/5 = 0,4. Знак оценки определяет сторону границы и не меняет величину расстояния.",
    "answer": 0.4
  },
  {
    "title": "Найти опорные точки вручную",
    "question": "В одном измерении точки −2 и −1 имеют метку −1, а 1 и 2 — метку +1. Найдите hard-margin решение w, b и опорные точки. Почему w = 0,5, b = 0 не подходит в канонической нормировке?",
    "hint": "Симметрия подсказывает b = 0. Проверьте ограничения yᵢ(wxᵢ + b) ≥ 1 на ближайших к нулю точках.",
    "solution": "Оптимум w = 1, b = 0. Опорные точки −1 и +1: их отступы равны 1. У точек ±2 отступ равен 2. Полоса шириной 2. При w = 0,5 отступы ближайших точек равны 0,5, поэтому ограничения hard margin нарушены, хотя классы предсказаны правильно."
  },
  {
    "title": "Вычислить hinge loss",
    "question": "Метка объекта y = −1, оценка модели f(x) = 0,6. Вычислите hinge loss. Затем объясните, почему при f(x) = −0,6 потеря всё ещё не равна нулю.",
    "hint": "Сначала вычислите m = y·f(x), затем max(0, 1 − m). Не заменяйте f(x) знаком предсказания.",
    "solution": "При f = 0,6: m = −0,6 и L = 1,6. При f = −0,6: m = 0,6, класс правильный, но L = 0,4 — точка внутри полосы. Нулевая потеря для y = −1 начинается при f ≤ −1.",
    "answer": 1.6
  },
  {
    "title": "Собрать целевую функцию",
    "question": "Известно ‖w‖² = 4, C = 3 и минимальные ослабления ξ = (0,2; 0; 1,5). Найдите значение ½‖w‖² + C∑ξᵢ. Какие объекты нарушают зазор и какой классифицирован ошибочно?",
    "hint": "Квадрат нормы уже дан: не возводите 4 в квадрат ещё раз. ξ > 0 означает нарушение, ξ > 1 — ошибочный класс.",
    "solution": "½·4 + 3·(0,2 + 0 + 1,5) = 2 + 5,1 = 7,1. Первый объект в полосе, но с верным классом. Второй не нарушает зазор. Третий — ошибочно классифицирован, поскольку ξ₃ = 1,5.",
    "answer": 7.1
  },
  {
    "title": "Оценить похожесть через RBF",
    "question": "Для x = (1, 0), z = (0, 1) и γ = 0,5 найдите K(x, z). Округлите до четырёх знаков. Что произойдёт со значением ядра, если γ увеличить до 2?",
    "hint": "Квадрат расстояния равен (1 − 0)² + (0 − 1)² = 2. Подставьте его в exp(−γ‖x−z‖²).",
    "solution": "При γ = 0,5: K = exp(−1) ≈ 0,3679. При γ = 2: K = exp(−4) ≈ 0,0183. На том же расстоянии похожесть стала гораздо меньше: влияние стало локальнее.",
    "answer": 0.3679,
    "tolerance": 0.001
  },
  {
    "title": "Разделить кольца новым признаком",
    "question": "Точки одного класса лежат на окружности радиуса 1, другого — радиуса 2. Предложите дополнительный признак и разделяющую плоскость в расширенном пространстве. Какой вид имеет граница в исходной плоскости?",
    "hint": "Рассмотрите z = x₁² + x₂². У объектов с постоянным радиусом этот признак постоянен.",
    "solution": "У внутреннего класса z = 1, у внешнего z = 4. Плоскость z = 2,5 разделяет эти два уровня. В исходных координатах граница x₁² + x₂² = 2,5 — окружность радиуса √2,5. При толщине колец нужно проверить, остаются ли диапазоны z непересекающимися."
  },
  {
    "title": "Прогноз только по опорным векторам",
    "question": "Есть два опорных вектора: α₁ = 0,8, y₁ = +1 и α₂ = 0,8, y₂ = −1. Для нового x значения ядра равны K(x₁,x) = 0,9 и K(x₂,x) = 0,2. Смещение b = −0,1. Найдите f(x) и класс.",
    "hint": "Сложите α₁y₁K₁ + α₂y₂K₂ + b. Коэффициент второго вектора даёт отрицательный вклад.",
    "solution": "f(x) = 0,8·1·0,9 + 0,8·(−1)·0,2 − 0,1 = 0,72 − 0,16 − 0,10 = 0,46. Класс +1. Объекты с α = 0 в сумму не входят.",
    "answer": 0.46
  },
  {
    "title": "Проверить двойственные ограничения",
    "question": "Метки y = (+1, +1, −1), C = 1. Допустимы ли коэффициенты α = (0,4; 0,3; 0,7)? А α = (0,4; 0,3; 0,6)? Доказывает ли допустимость оптимальность?",
    "hint": "Проверьте отдельно интервалы 0 ≤ αᵢ ≤ C и равенство ∑αᵢyᵢ = 0.",
    "solution": "Первый набор допустим: все α в [0,1] и 0,4 + 0,3 − 0,7 = 0. Второй недопустим: сумма равна 0,1. Допустимость не доказывает оптимальность: нужно максимизировать двойственную цель и проверить условия оптимальности."
  },
  {
    "title": "Увидеть переобучение",
    "question": "В лаборатории выберите «Пересечение» и RBF. Сравните (C = 0,1; γ = 0,1), (C = 10; γ = 1) и (C = 100; γ = 10). Опишите изменения границы, опорных точек и точности. Можно ли по этим числам выбрать лучшую модель?",
    "hint": "Обратите внимание на маленькие островки вокруг точек. Здесь доступна только обучающая точность.",
    "solution": "Обычно большие C и γ создают более локальную границу и могут повысить обучающую точность, в том числе за счёт подгонки к шуму. Конкретный результат зависит от набора и сходимости. По обучающей точности нельзя выбрать лучшую модель для новых данных: нужны валидация и подбор параметров. Если показан лимит итераций, дополнительно учитывайте приближённость решения."
  },
  {
    "title": "Объяснить цену прогноза",
    "question": "В обучении было 50 000 объектов с 100 признаками, но в итоговой модели 200 опорных векторов. Сколько вычислений ядра требуется для одного нового объекта? От чего зависит порядок стоимости? Что изменится для линейного ядра?",
    "hint": "Посмотрите на сумму в формуле f(x). Для линейного случая попробуйте вынести новый x из суммы.",
    "solution": "Нужно 200 вычислений ядра. Если одно ядро считается за O(d), цена — O(200·100), то есть O(nSV·d), а не O(n·d). Это порядок операций, не точное число тактов. Для линейного ядра можно один раз собрать w = ∑αᵢyᵢxᵢ и затем считать прогноз за O(d).",
    "answer": 200,
    "tolerance": 0
  },
  {
    "title": "Найти утечку данных",
    "question": "Исследователь стандартизовал весь датасет, затем разделил его на train/test. После этого он выбирал C и γ по точности на test и сообщил максимальный результат. Назовите две ошибки и предложите корректную процедуру.",
    "hint": "Когда были вычислены средние и стандартные отклонения? Какая выборка фактически использовалась для выбора модели?",
    "solution": "Первая ошибка: масштабирование увидело test — параметры преобразования нужно обучать только на train. Вторая: test использован для выбора гиперпараметров, поэтому итоговая оценка оптимистична. Сначала выделяют test, затем внутри train проводят CV с pipeline «масштабирование → SVM»; scaler обучают отдельно в каждом фолде. После выбора параметров переобучают pipeline на всём train и один раз оценивают на test."
  }
];

export function svmExercisesView() {
  return `<section class="theory-block algorithm-section svm-exercises" id="svm-exercises">
    <h2>Задачи по SVM</h2>
    <p>Реши задачу, затем сравни ход рассуждения с разбором. Семь числовых ответов можно проверить сразу.</p>
    <p data-svm-progress aria-live="polite">Решено 0 из ${tasks.length}</p>
    ${tasks.map((task, index) => {
      const id = index + 1;
      const answerForm = task.answer === undefined ? '' : `
        <form class="svm-answer-form" data-svm-task="${id}">
          <label>Числовой ответ <input type="text" name="answer" inputmode="decimal" required></label>
          <button class="secondary">Проверить</button>
        </form>
        <p class="svm-answer-feedback" aria-live="polite"></p>`;
      return `<article class="svm-exercise" id="svm-task-${id}">
        <h3>${id}. ${task.title}</h3>
        <p>${task.question}</p>
        ${answerForm}
        <details><summary>Подсказка</summary><p>${task.hint}</p></details>
        <details><summary>Решение</summary><p>${task.solution}</p></details>
        <label class="svm-completion"><input type="checkbox" value="${id}" data-svm-completed> Я разобрался с этой задачей</label>
      </article>`;
    }).join('')}
  </section>`;
}

export const svmHingeExplorer = `
  <div class="svm-hinge-explorer">
    <label for="svm-hinge-margin">Функциональный отступ m = y·f(x)</label>
    <div class="range-line">
      <input class="range-control" id="svm-hinge-margin" type="range" min="-2" max="3" step=".1" value=".5">
      <output class="range-value" id="svm-hinge-value" for="svm-hinge-margin">0,5</output>
    </div>
    <svg viewBox="0 0 420 132" role="img" aria-label="График hinge loss. Потеря убывает до нуля при m = 1.">
      <path class="svm-hinge-axis" d="M22 110H395M172 116V15"/>
      <path class="svm-hinge-line" d="M32 20L242 110H382"/>
      <circle id="svm-hinge-marker" cx="207" cy="95" r="5"/>
      <text x="20" y="14">loss</text><text x="402" y="115">m</text><text x="237" y="127">1</text>
    </svg>
    <p>Потеря <output id="svm-hinge-loss" for="svm-hinge-margin">0,5</output>. <span id="svm-hinge-state">Класс верный, зазор нарушен.</span></p>
  </div>`;

export function mountSvmStudy(root) {
  const hinge = root.querySelector('#svm-hinge-margin');
  hinge?.addEventListener('input', () => {
    const value = Number(hinge.value);
    const loss = Math.max(0, 1 - value);
    root.querySelector('#svm-hinge-value').textContent = value.toFixed(1).replace('.', ',');
    root.querySelector('#svm-hinge-loss').textContent = loss.toFixed(1).replace('.', ',');
    root.querySelector('#svm-hinge-marker').setAttribute('cx', 32 + (value + 2) * 70);
    root.querySelector('#svm-hinge-marker').setAttribute('cy', 110 - loss * 30);
    root.querySelector('#svm-hinge-state').textContent = value < 0 ? 'Неверный класс.'
      : value === 0 ? 'Точка на границе.'
      : value < 1 ? 'Класс верный, зазор нарушен.' : 'Класс верный, зазор соблюдён.';
  });

  const exercises = root.querySelector('#svm-exercises');
  if (!exercises) return;
  const key = 'fitpredict-svm-exercises';
  let completed = [];
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) completed = saved;
  } catch {}
  const checks = [...exercises.querySelectorAll('[data-svm-completed]')];
  const progress = exercises.querySelector('[data-svm-progress]');
  function updateProgress() {
    const ids = checks.filter(check => check.checked).map(check => check.value);
    progress.textContent = `Решено ${ids.length} из ${tasks.length}`;
    try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
  }
  for (const check of checks) {
    check.checked = completed.includes(check.value);
    check.addEventListener('change', updateProgress);
  }
  updateProgress();

  exercises.querySelectorAll('[data-svm-task]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = new FormData(form).get('answer').trim().replace(',', '.').replace('−', '-');
      const task = tasks[Number(form.dataset.svmTask) - 1];
      const value = Number(input);
      const correct = input !== '' && Number.isFinite(value) && Math.abs(value - task.answer) <= (task.tolerance ?? .01);
      form.nextElementSibling.textContent = correct ? 'Верно.' : 'Ответ пока не совпадает. Попробуй воспользоваться подсказкой.';
      if (correct) {
        form.closest('.svm-exercise').querySelector('[data-svm-completed]').checked = true;
        updateProgress();
      }
    });
  });
}
