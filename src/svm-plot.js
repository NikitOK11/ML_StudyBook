// Use one pixel scale for both axes so geometric distances keep their shape.
function projection(width, height, points) {
  const xExtent = Math.max(3, ...points.map(point => Math.abs(point.x)));
  const yExtent = Math.max(3, ...points.map(point => Math.abs(point.y)));
  const unit = Math.min(width / (2 * xExtent), height / (2 * yExtent));
  return { unit, xLimit: width / (2 * unit), yLimit: height / (2 * unit) };
}

export function svmPlotBounds(canvas, points) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return { xLimit: 3, yLimit: 3 };
  return projection(width, height, points);
}

export function drawSvmPlot(canvas, points, model, { margin, support, draft }) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const { unit, xLimit, yLimit } = projection(width, height, points);
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  const palette = getComputedStyle(canvas);
  const positive = palette.getPropertyValue('--green').trim();
  const negative = palette.getPropertyValue('--red').trim();
  const boundary = palette.getPropertyValue('--amber').trim();
  context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
  context.fillStyle = palette.getPropertyValue('--panel').trim();
  context.fillRect(0, 0, width, height);

  if (model?.ready) {
    const step = draft ? 12 : 6;
    const columns = Math.ceil(width / step);
    const rows = Math.ceil(height / step);
    const dx = width / columns;
    const dy = height / rows;
    const scores = Array.from({ length: rows + 1 }, (_, row) =>
      Float64Array.from({ length: columns + 1 }, (_, column) => model.predict({
        x: column * dx / unit - xLimit,
        y: yLimit - row * dy / unit
      }))
    );

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const score = scores[row][column];
        const inMargin = margin && Math.abs(score) < 1;
        context.fillStyle = score >= 0
          ? (inMargin ? '#17221d' : '#1e3429')
          : (inMargin ? '#271b1d' : '#382123');
        context.fillRect(column * dx, row * dy, dx + .5, dy + .5);
      }
    }
    if (margin) {
      drawContour(context, scores, dx, dy, -1, '#d9b871', true);
      drawContour(context, scores, dx, dy, 1, '#d9b871', true);
    }
    drawContour(context, scores, dx, dy, 0, boundary);
  }

  const toX = x => width / 2 + x * unit;
  const toY = y => height / 2 - y * unit;
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(255,255,255,.14)';
  context.beginPath();
  for (let tick = Math.ceil(-xLimit); tick < xLimit; tick++) {
    context.moveTo(toX(tick), 0);
    context.lineTo(toX(tick), height);
  }
  for (let tick = Math.ceil(-yLimit); tick < yLimit; tick++) {
    context.moveTo(0, toY(tick));
    context.lineTo(width, toY(tick));
  }
  context.stroke();
  context.font = '11px system-ui';
  context.fillStyle = '#c5c3c8';
  for (let tick = Math.ceil(-xLimit + .25); tick < xLimit - .35; tick++) {
    if (tick) context.fillText(String(tick), toX(tick) + 4, toY(0) + 15);
  }
  for (let tick = Math.ceil(-yLimit + .25); tick < yLimit - .35; tick++) {
    if (tick) context.fillText(String(tick), toX(0) + 5, toY(tick) - 5);
  }
  context.fillText('x₁', width - 22, toY(0) - 7);
  context.fillText('x₂', toX(0) + 5, 16);

  points.forEach((point, index) => {
    const x = toX(point.x);
    const y = toY(point.y);
    if (support && model?.alpha[index] > 1e-6) {
      context.beginPath();
      context.arc(x, y, 9, 0, Math.PI * 2);
      context.strokeStyle = boundary;
      context.lineWidth = 1.4;
      context.stroke();
    }
    context.beginPath();
    if (point.label === 1) {
      context.arc(x, y, 4.5, 0, Math.PI * 2);
    } else {
      context.moveTo(x, y - 5.5);
      context.lineTo(x + 5.5, y);
      context.lineTo(x, y + 5.5);
      context.lineTo(x - 5.5, y);
      context.closePath();
    }
    context.fillStyle = point.label === 1 ? positive : negative;
    context.fill();
    context.strokeStyle = '#121213';
    context.lineWidth = 1;
    context.stroke();
  });
}

function drawContour(context, scores, dx, dy, level, color, dashed = false) {
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth = dashed ? 1 : 2;
  context.setLineDash(dashed ? [4, 4] : []);
  for (let row = 0; row < scores.length - 1; row++) {
    for (let col = 0; col < scores[row].length - 1; col++) {
      const values = [scores[row][col], scores[row][col + 1], scores[row + 1][col + 1], scores[row + 1][col]];
      const high = values.map(value => value >= level);
      if (high.every(value => value === high[0])) continue;
      const corners = [[col, row], [col + 1, row], [col + 1, row + 1], [col, row + 1]];
      const intersections = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if (high[edge] === high[next]) continue;
        const t = (level - values[edge]) / (values[next] - values[edge]);
        const [x, y] = corners[edge];
        const [nextX, nextY] = corners[next];
        intersections.push([(x + t * (nextX - x)) * dx, (y + t * (nextY - y)) * dy]);
      }
      // Match the saddle-cell segments to the sign at the center.
      if (intersections.length === 4 && (values.reduce((a, b) => a + b, 0) / 4 >= level) !== high[0]) {
        intersections.unshift(intersections.pop());
      }
      for (let index = 0; index < intersections.length; index += 2) {
        context.moveTo(...intersections[index]);
        context.lineTo(...intersections[index + 1]);
      }
    }
  }
  context.stroke();
  context.setLineDash([]);
}

export function svmPointAt(canvas, event, points) {
  const rect = canvas.getBoundingClientRect();
  const { unit, xLimit, yLimit } = projection(rect.width, rect.height, points);
  return {
    x: (event.clientX - rect.left) / unit - xLimit,
    y: yLimit - (event.clientY - rect.top) / unit
  };
}
