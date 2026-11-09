import { forward } from './core.js';

export function createPlots(root, e) {
  const prediction = root.querySelector('[data-mlp-prediction]'), loss = root.querySelector('[data-mlp-loss]');
  const small = document.createElement('canvas'); small.width = 80; small.height = 60;
  const smallContext = small.getContext('2d'), pixels = smallContext.createImageData(80, 60);
  const probabilities = new Float64Array(80 * 60), input = new Float64Array(e.dataset.dimensions);
  const axes = (ctx, xLabel, yLabel, xMin, xMax, yMin, yMax, height) => {
    ctx.clearRect(0, 0, 640, height); ctx.fillStyle = '#101313'; ctx.fillRect(42, 25, 568, height - 70);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#afb7b8'; ctx.strokeStyle = '#293030';
    for (let i = 0; i <= 4; i++) {
      const x = 42 + 568 * i / 4, y = 25 + (height - 70) * i / 4;
      ctx.beginPath(); ctx.moveTo(x, 25); ctx.lineTo(x, height - 45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(610, y); ctx.stroke();
      ctx.fillText((xMin + (xMax - xMin) * i / 4).toFixed(xLabel === 'Шаг SGD' ? 0 : 1), x - 9, height - 24);
      ctx.fillText((yMax - (yMax - yMin) * i / 4).toFixed(2), 2, y + 4);
    }
    ctx.fillText(xLabel, 350, height - 5); ctx.fillText(yLabel, 42, 15);
  };
  function drawPrediction(row) {
    const ctx = prediction.getContext('2d'), regression = e.dataset.task === 'regression';
    const xMin = regression ? -3.2 : -1.65, xMax = -xMin, yMin = regression ? -2 : -1.65, yMax = -yMin;
    const xp = x => 42 + (x - xMin) / (xMax - xMin) * 568, yp = y => 375 - (y - yMin) / (yMax - yMin) * 350;
    axes(ctx, regression ? 'Положение на оси' : 'Горизонтальная координата', regression ? 'Значение волны' : 'Вертикальная координата', xMin, xMax, yMin, yMax, 420);
    ctx.save(); ctx.beginPath(); ctx.rect(42, 25, 568, 350); ctx.clip();
    if (!regression) {
      for (let iy = 0; iy < 60; iy++) for (let ix = 0; ix < 80; ix++) {
        input[0] = (xMin + (ix + .5) / 80 * (xMax - xMin) - e.dataset.mean[0]) / e.dataset.std[0];
        input[1] = (yMax - (iy + .5) / 60 * (yMax - yMin) - e.dataset.mean[1]) / e.dataset.std[1];
        const p = forward(e.model, input, e.evaluation), index = iy * 80 + ix;
        probabilities[index] = p;
        pixels.data[index * 4] = 95 - 60 * p; pixels.data[index * 4 + 1] = 35 + 61 * p; pixels.data[index * 4 + 2] = 51 + 33 * p; pixels.data[index * 4 + 3] = 255;
      }
      smallContext.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 42, 25, 568, 350);
      ctx.strokeStyle = '#f2f1df'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let y = 0; y < 59; y++) for (let x = 0; x < 79; x++) {
        const p = probabilities[y * 80 + x], right = probabilities[y * 80 + x + 1], below = probabilities[(y + 1) * 80 + x];
        if ((p < .5) !== (right < .5)) { const px = 42 + (x + .5 + (.5 - p) / (right - p)) / 80 * 568; ctx.moveTo(px, 25 + y / 60 * 350); ctx.lineTo(px, 25 + (y + 1) / 60 * 350); }
        if ((p < .5) !== (below < .5)) { const py = 25 + (y + .5 + (.5 - p) / (below - p)) / 60 * 350; ctx.moveTo(42 + x / 80 * 568, py); ctx.lineTo(42 + (x + 1) / 80 * 568, py); }
      }
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffb900'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = xMin + i / 200 * (xMax - xMin); input[0] = (x - e.dataset.mean[0]) / e.dataset.std[0];
        const y = forward(e.model, input, e.evaluation);
        if (i === 0) ctx.moveTo(xp(x), yp(y)); else ctx.lineTo(xp(x), yp(y));
      }
      ctx.stroke();
    }
    for (const [split, validation] of [[e.dataset.train, false], [e.dataset.validation, true]]) for (let i = 0; i < split.count; i++) {
      const x = xp(split.raw[i * e.dataset.dimensions]), y = yp(regression ? split.y[i] : split.raw[i * 2 + 1]);
      ctx.fillStyle = regression ? '#dce6e3' : split.y[i] ? '#5dd6c4' : '#ff7f91';
      ctx.strokeStyle = '#101111'; ctx.lineWidth = 1; ctx.beginPath();
      if (validation) { ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.3; ctx.stroke(); }
      else { ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }
    }
    const selected = e.dataset.train;
    ctx.beginPath(); ctx.arc(xp(selected.raw[row * e.dataset.dimensions]), yp(regression ? selected.y[row] : selected.raw[row * 2 + 1]), 7, 0, Math.PI * 2); ctx.strokeStyle = '#ffb900'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function drawLoss() {
    const ctx = loss.getContext('2d'), maxStep = Math.max(1, e.steps);
    const maximum = Math.max(.01, ...e.history.flatMap(p => [p.train, p.validation]).filter(Number.isFinite)) * 1.08;
    axes(ctx, 'Шаг SGD', 'Ошибка', 0, maxStep, 0, maximum, 300);
    for (const [key, color] of [['train', '#ffb900'], ['validation', '#5dd6c4']]) {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
      e.history.forEach((p, i) => { const x = 42 + p.step / maxStep * 568, y = 255 - p[key] / maximum * 230; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    }
  }
  return { update(row) { drawPrediction(row); drawLoss(); }, bufferBytes: pixels.data.byteLength + probabilities.byteLength + input.byteLength };
}
