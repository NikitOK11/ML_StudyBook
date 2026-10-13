const round = value => Number(value.toFixed(4));

function makeLinearRows(offset, count) {
  return Array.from({ length: count }, (_, index) => {
    const position = index + offset;
    const selfStudy = -1.7 + position * 3.4 / (count + offset - 1);
    const practice = 1.25 * Math.sin(position * 1.19) + .42 * Math.cos(position * .47);
    const seminars = 1.1 * Math.cos(position * .73) - .26 * Math.sin(position * 1.83);
    const noise = .22 * Math.sin(position * 1.71) + .1 * Math.cos(position * .61);
    const target = 1.78 * selfStudy + .84 * practice + .56 * seminars + .75 + noise;
    return { features: [round(selfStudy), round(practice), round(seminars)], target: round(target) };
  });
}

function makeNonlinearRows(offset, count) {
  return Array.from({ length: count }, (_, index) => {
    const position = index + offset;
    const workload = -2.1 + position * 4.2 / (count + offset - 1);
    const sleep = 1.05 * Math.sin(position * .83) + .3 * Math.cos(position * 1.61);
    const stress = 1.12 * Math.cos(position * .58) - .24 * Math.sin(position * 1.37);
    const noise = .18 * Math.cos(position * 1.21);
    const target = .74 * workload ** 2 + .62 * sleep - .48 * stress - 1.7 + noise;
    return { features: [round(workload), round(sleep), round(stress)], target: round(target) };
  });
}

function makeCorrelatedRows(offset, count, validation = false) {
  return Array.from({ length: count }, (_, index) => {
    const position = index + offset;
    const x1 = -1.6 + position * 3.2 / (count + offset - 1);
    const drift = .036 * Math.sin(position * 1.73) + .014 * Math.cos(position * .43);
    const x2 = x1 + drift;
    const x3 = .985 * x1 + .027 * Math.cos(position * 1.17);
    // В train случайный узор drift притворяется сигналом; в validation его уже нет.
    // Чтобы подогнаться без L2, модели нужны большие взаимно компенсирующиеся веса.
    const target = 2.55 * x1 + (validation ? 0 : 170 * drift) + .05 * Math.sin(position * .91);
    return { features: [round(x1), round(x2), round(x3)], target: round(target) };
  });
}

const linearRows = makeLinearRows(0, 72);
const nonlinearRows = makeNonlinearRows(0, 72);
const correlatedRows = makeCorrelatedRows(0, 96);

export const linearDatasets = {
  linear: {
    label: 'Результат обучения',
    description: 'Три показателя учебной работы линейно влияют на итоговый балл. Значения нормированы, чтобы эксперимент был устойчивым при разных learning rate.',
    featureNames: ['Самостоятельная подготовка', 'Практика на задачах', 'Работа на семинарах'],
    equationNames: ['подготовка', 'практика', 'семинары'],
    targetName: 'Итоговый балл',
    rows: linearRows,
    validation: makeLinearRows(72, 32),
    points: linearRows.map(row => [row.features[0], row.target])
  },
  nonlinear: {
    label: 'Восстановление после нагрузки',
    description: 'Самочувствие зависит от нагрузки нелинейно, а от сна и стресса — линейно. Это крайний пример, где линейная модель систематически ошибается.',
    featureNames: ['Интенсивность нагрузки', 'Качество сна', 'Уровень стресса'],
    equationNames: ['нагрузка', 'сон', 'стресс'],
    targetName: 'Индекс восстановления',
    rows: nonlinearRows,
    validation: makeNonlinearRows(72, 32),
    points: nonlinearRows.map(row => [row.features[0], row.target])
  },
  correlated: {
    label: 'Стоимость квартиры',
    description: 'Три почти дублирующих показателя площади описывают стоимость квартиры. Данные нормированы, чтобы внимание осталось на корреляции, а не на масштабе единиц.',
    featureNames: ['Общая площадь', 'Жилая площадь', 'Площадь комнат'],
    equationNames: ['общая площадь', 'жилая площадь', 'площадь комнат'],
    targetName: 'Рыночная стоимость',
    rows: correlatedRows,
    validation: makeCorrelatedRows(96, 48, true),
    points: correlatedRows.map(row => [row.features[0], row.target]),
    warning: 'Общая, жилая площади и площадь комнат почти дублируют друг друга. При λ = 0 шум из train может раздувать взаимно компенсирующиеся веса.'
  }
};

function deterministicUnit(index, salt) {
  const raw = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function knnCluster(count, centerX, centerY, spreadX, spreadY, label, salt) {
  return Array.from({ length: count }, (_, index) => ({
    x: round(Math.max(.25, Math.min(9.75, centerX + (deterministicUnit(index, salt) * 2 - 1) * spreadX))),
    y: round(Math.max(4, Math.min(116, centerY + (deterministicUnit(index, salt + 1) * 2 - 1) * spreadY))),
    c: label
  }));
}

export const knnPoints = [
  ...knnCluster(29, 2.8, 35, 1.9, 32, 0, 3),
  ...knnCluster(29, 7.15, 84, 1.65, 28, 1, 9)
];

export const knnTarget = { x: 3.3, y: 82 };
export const knnFeatureNames = ['Сложность задачи', 'Время решения, мин'];
export const knnTargetName = 'Статус решения';
export const knnClassNames = { 0: 'нужна помощь', 1: 'решено самостоятельно' };

// Две нормированные оси позволяют увидеть именно линейный score и переход
// через сигмоиду, не пряча механику за разными единицами измерения.
export const logisticFeatureNames = ['Качество подготовки', 'Уверенность на пробнике'];
export const logisticTargetName = 'Готовность к сложному модулю';
export const logisticClassNames = { 0: 'нужна доработка', 1: 'готов' };
export const logisticRows = Array.from({ length: 66 }, (_, index) => {
  const preparation = -2.15 + deterministicUnit(index, 51) * 4.3;
  const confidence = -2.0 + deterministicUnit(index, 67) * 4.0;
  const score = 1.24 * preparation + .93 * confidence - .18 + .44 * Math.sin(index * 1.73);
  return { features: [round(preparation), round(confidence)], target: Number(score > 0) };
});

export const treeFeatureNames = {
  x: 'Доход клиента',
  y: 'Кредитный рейтинг'
};
export const treeTargetName = 'Решение по заявке';

const treeSeedPoints = [
  { x: 1.0, y: 1.2, c: 0 }, { x: 1.8, y: 2.2, c: 0 }, { x: 2.5, y: 1.4, c: 0 },
  { x: 3.1, y: 3.0, c: 0 }, { x: 3.9, y: 2.4, c: 0 }, { x: 5.2, y: 1.1, c: 1 },
  { x: 6.1, y: 2.2, c: 1 }, { x: 7.0, y: 1.4, c: 1 }, { x: 7.7, y: 2.9, c: 1 },
  { x: 8.6, y: 2.0, c: 1 }, { x: 1.4, y: 6.8, c: 1 }, { x: 2.7, y: 7.6, c: 1 },
  { x: 3.6, y: 6.2, c: 1 }, { x: 4.2, y: 7.8, c: 1 }, { x: 6.0, y: 6.3, c: 0 },
  { x: 7.1, y: 7.5, c: 0 }, { x: 8.4, y: 6.7, c: 0 }
];

export const treePoints = [
  ...treeSeedPoints,
  ...Array.from({ length: 36 }, (_, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const x = 1 + column * 1.55 + .17 * Math.sin(index * 1.37);
    const y = 1 + row * 1.48 + .19 * Math.cos(index * .91);
    return { x: round(x), y: round(y), c: x <= 5 ? Number(y > 5) : Number(y < 5) };
  })
];

export const treeValidation = [
  { x: 2, y: 2, c: 0 }, { x: 7, y: 2, c: 1 }, { x: 2, y: 7, c: 1 },
  { x: 7, y: 7, c: 0 }, { x: 5, y: 6, c: 1 }, { x: 4, y: 3, c: 0 }
];

// SVM получает небольшую, но не игрушечную геометрическую задачу. Метки храним
// как -1/+1: именно в таком виде естественно записывается hinge loss.
function svmCluster(count, centerX, centerY, spreadX, spreadY, label, salt) {
  return Array.from({ length: count }, (_, index) => ({
    x: round(Math.max(.35, Math.min(9.65, centerX + (deterministicUnit(index, salt) * 2 - 1) * spreadX))),
    y: round(Math.max(.35, Math.min(9.65, centerY + (deterministicUnit(index, salt + 1) * 2 - 1) * spreadY))),
    c: label
  }));
}

export const svmPoints = [
  ...svmCluster(25, 2.9, 3.15, 1.72, 1.42, -1, 21),
  ...svmCluster(25, 7.05, 6.85, 1.64, 1.38, 1, 37),
  // Пограничные объекты удерживают зазор на месте; один объект делает задачу
  // мягкого зазора содержательной, а не идеально разделимой картинкой.
  { x: 4.55, y: 5.20, c: -1 },
  { x: 5.10, y: 4.65, c: 1 },
  { x: 5.65, y: 5.68, c: 1 }
];

export const svmFeatureNames = ['Самостоятельная практика', 'Качество разбора решений'];
export const svmTargetName = 'Устойчивость результата';
export const svmClassNames = { '-1': 'риск ошибки', '1': 'устойчивый результат' };

export const moduleCatalog = [
  { id: 'knn', title: 'KNN', subtitle: 'соседи и расстояния', stage: '01', available: true },
  { id: 'linear', title: 'Линейная регрессия', subtitle: 'веса и градиентный спуск', stage: '02', available: true },
  { id: 'logistic', title: 'Логистическая регрессия', subtitle: 'score, сигмоида и log-loss', stage: '03', available: true },
  { id: 'tree', title: 'Решающее дерево', subtitle: 'сплиты и impurity', stage: '04', available: true },
  { id: 'svm', title: 'SVM', subtitle: 'зазор и опорные векторы', stage: '05', available: true }
];
