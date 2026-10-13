import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 4175;
const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${port}`;
const server = process.env.TEST_BASE_URL ? null : spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore'
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
  }
  throw new Error('Local test server did not start');
}

async function openModule(page, id) {
  await page.locator(`[data-select-module="${id}"]`).click();
  await page.locator('[data-action="open-module"]').click();
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  // Сценарий 1: первый вход, полноценная регистрация и профиль.
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  firstPage.on('pageerror', error => errors.push(error.message));
  await firstPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await firstPage.waitForSelector('.intro-screen');
  if (await firstPage.locator('header').count()) throw new Error('First screen must not contain navigation');
  if (!(await firstPage.locator('.intro-screen').innerText()).includes('Начать обучение')) throw new Error('First screen CTA is missing');

  await firstPage.locator('[data-action="start-learning"]').click();
  await firstPage.locator('[data-action="demo-train"]').click();
  await firstPage.waitForSelector('form[data-form="signup"]', { timeout: 5000 });
  await firstPage.locator('input[name="fullName"]').fill('Никита Тестов');
  await firstPage.locator('input[name="email"]').fill('nikita@example.com');
  await firstPage.locator('form[data-form="signup"]').getByRole('button', { name: 'Зарегистрироваться' }).click();
  await firstPage.waitForSelector('.map-screen');
  if (await firstPage.locator('[data-select-module]').count() !== 5) throw new Error('The map must show the five available algorithms');
  if (await firstPage.locator('.module-route').count() !== 1) throw new Error('Map must render one continuous route through all modules');
  if ((await firstPage.locator('.map').innerText()).includes('/')) throw new Error('Module cards must not show stage copy after a slash');
  if (await firstPage.getByRole('button', { name: 'Учебник' }).count() !== 1) throw new Error('Navigation must label the map as the textbook');

  await firstPage.getByRole('button', { name: 'Профиль' }).click();
  await firstPage.waitForSelector('.profile-card');
  if (await firstPage.locator('input[name="fullName"]').inputValue() !== 'Никита Тестов') throw new Error('Profile did not retain registration details');
  await firstPage.locator('[data-avatar]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9J1z0AAAAASUVORK5CYII=', 'base64')
  });
  await firstPage.waitForSelector('.avatar img');
  await firstPage.getByRole('button', { name: 'О проекте' }).click();
  await firstPage.waitForSelector('.info-screen');
  if (!(await firstPage.locator('.info-screen').innerText()).includes('актуальная информация')) throw new Error('About page placeholder is missing');
  await firstContext.close();

  // Сценарий 2: пропуск регистрации и все три алгоритма.
  const learningContext = await browser.newContext();
  const page = await learningContext.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-action="start-learning"]').click();
  await page.locator('[data-action="demo-train"]').click();
  await page.waitForSelector('[data-action="skip-signup"]', { timeout: 5000 });
  await page.locator('[data-action="skip-signup"]').click();
  await page.waitForSelector('.map-screen');

  await openModule(page, 'linear');
  await page.waitForSelector('[data-linear-weight="0"]');
  if (await page.locator('[data-linear-weight]').count() !== 3) throw new Error('Every linear-regression experiment must expose three named feature weights');
  if (!(await page.locator('.weights-stage').textContent()).includes('Самостоятельная подготовка')) throw new Error('Linear features must use meaningful names');
  if (await page.locator('[data-linear-line="linear"]').count()) throw new Error('Linear lab must show numerical weights instead of a point chart');
  const initialWeight = await page.locator('[data-linear-weight="0"]').innerText();
  const beforeLoss = await page.locator('[data-linear-loss]').innerText();
  await page.locator('[data-action="linear-step"]').click();
  const afterLoss = await page.locator('[data-linear-loss]').innerText();
  if (beforeLoss === afterLoss || initialWeight === await page.locator('[data-linear-weight="0"]').innerText()) {
    throw new Error('One gradient step must update the visible numerical parameters');
  }
  const linearStageBeforeTraining = await page.locator('.weights-stage').elementHandle();
  await page.locator('[data-action="linear-train"]').click();
  if (!(await linearStageBeforeTraining.evaluate(node => node.isConnected))) throw new Error('Linear training must update values without rebuilding the whole scene');
  if (await page.locator('[data-linear-convergence]').getAttribute('data-linear-converged') !== 'true') throw new Error('Linear training must expose when gradient descent has converged');
  if (Number(await page.locator('[data-linear-steps]').innerText()) >= 1000) throw new Error('Linear training must stop on convergence instead of an arbitrary huge iteration count');
  await page.locator('[data-action="show-dataset"]').click();
  await page.waitForSelector('.dataset-profile-screen');
  if (await page.locator('.data-profile-hist-grid article').count() !== 3 || await page.locator('.data-target-numeric').count() !== 1) throw new Error('Linear dataset profile must expose feature and numerical-target distributions');
  if (await page.locator('.data-correlation td').count() !== 16) throw new Error('Linear dataset profile must include the correlation matrix with the target');
  await page.locator('.dataset-profile-sample summary').click();
  if (await page.locator('.dataset-profile-sample tbody tr').count() !== 10) throw new Error('Linear dataset profile must retain the first ten observations');
  await page.locator('[data-route="linear"]').click();
  await page.locator('[data-theory-route="linear-theory"][data-theory-section="linear-intro"]').click();
  await page.waitForSelector('#linear-analytic');
  if (!(await page.locator('#linear-analytic').innerText()).includes('Normal equations')) throw new Error('Linear theory must include the analytical solution proof');
  if (await page.locator('#linear-notation .notation-card dt').count() < 10) throw new Error('Linear theory must define its core notation before using formulas');
  if (await page.locator('#linear-gradient-derivation .derivation-step').count() < 6) throw new Error('Linear theory must derive the gradient step by step');
  if (await page.locator('#linear-lasso-geometry .regularization-geometry svg').count() !== 1) throw new Error('Linear theory must visualise the different L1 and L2 constraint geometry');
  if (!(await page.locator('#linear-regularization-deep').innerText()).includes('variance')) throw new Error('Linear theory must explain why regularisation can improve validation quality');
  if (!(await page.locator('#linear-causality').innerText()).includes('do(X=x)')) throw new Error('Linear theory must distinguish prediction from intervention');
  if (!(await page.locator('#linear-bayes').innerText()).includes('MAP')) throw new Error('Linear theory must derive the Bayesian reading of ridge');
  await page.locator('[data-action="toggle-theory-index"]').click();
  if (!(await page.locator('.theory-layout').getAttribute('class')).includes('is-index-collapsed')) throw new Error('Theory outline must collapse from its own control');
  if (await page.locator('.theory-index-content').isVisible()) throw new Error('Collapsed theory outline must release reading space');
  if ((await page.locator('.theory-screen').innerText()).toLowerCase().includes(['лабо', 'ратория'].join(''))) throw new Error('Public theory copy must use the algorithm terminology');
  await page.locator('[data-action="toggle-theory-index"]').click();
  await page.locator('[data-route="linear"]').first().click();
  await page.locator('[data-linear-dataset="correlated"]').click();
  if (await page.locator('[data-linear-weight]').count() !== 3) throw new Error('Correlated dataset must expose three model weights');
  if (await page.locator('input[data-control="linear.lr"]').getAttribute('max') !== '1') throw new Error('Learning-rate slider maximum must be one');
  if (await page.locator('input[data-control="linear.reg"]').getAttribute('max') !== '1') throw new Error('Regularization slider maximum must be one');
  await page.locator('input[data-control="linear.lr"]').evaluate(input => {
    input.value = '1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  if (await page.locator('[data-output="linear.lr"]').innerText() !== '1.00') throw new Error('Learning rate must allow values up to one');
  await page.locator('input[data-control="linear.lr"]').evaluate(input => {
    input.value = '.08';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('input[data-control="linear.reg"]').evaluate(input => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-action="linear-train"]').click();
  const correlatedWeights = await page.locator('[data-linear-weight]').allInnerTexts();
  if (!correlatedWeights.some(value => Math.abs(Number(value)) > 20)) throw new Error('Unregularized correlated dataset must expose unstable large weights');
  if (await page.locator('[data-linear-convergence]').getAttribute('data-linear-stop-reason') !== 'limit') throw new Error('Ill-conditioned unregularized data must report that the convergence budget was reached');
  if (Number(await page.locator('[data-linear-steps]').innerText()) !== 5000) throw new Error('Ill-conditioned training must stop at the explicit 5,000-step budget');
  const unregularizedValidation = Number(await page.locator('[data-linear-validation-loss]').innerText());
  await page.locator('input[data-control="linear.reg"]').evaluate(input => {
    input.value = '.08';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const linearStageBeforeReset = await page.locator('.weights-stage').elementHandle();
  await page.locator('[data-action="linear-reset"]').click();
  if (!(await linearStageBeforeReset.evaluate(node => node.isConnected))) throw new Error('Resetting linear weights must not rebuild the whole scene');
  await page.locator('[data-action="linear-train"]').click();
  const regularizedWeights = await page.locator('[data-linear-weight]').allInnerTexts();
  const regularizedValidation = Number(await page.locator('[data-linear-validation-loss]').innerText());
  if (regularizedWeights.some(value => Math.abs(Number(value)) > 10) || regularizedValidation >= unregularizedValidation) {
    throw new Error('L2 regularization must stabilize the correlated experiment and improve validation loss');
  }
  await page.locator('input[data-control="linear.reg"]').evaluate(input => {
    input.value = '1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-action="linear-reset"]').click();
  for (let step = 0; step < 35; step += 1) await page.locator('[data-action="linear-step"]').click();
  if (await page.locator('[data-linear-convergence]').getAttribute('data-linear-converged') !== 'true') throw new Error('Manual linear steps must mark convergence once weights stop meaningfully changing');
  if (Number(await page.locator('[data-linear-steps]').innerText()) > 30) throw new Error('Manual stepping must stop at the detected convergence point');
  await page.locator('button.back').click();

  await openModule(page, 'logistic');
  await page.waitForSelector('.logistic-chart');
  const initialLogisticLoss = Number((await page.locator('.logistic-lab .metric').innerText()).replace('BCE ', ''));
  await page.locator('[data-action="logistic-step"]').click();
  const oneStepLogisticLoss = Number((await page.locator('.logistic-lab .metric').innerText()).replace('BCE ', ''));
  if (!(oneStepLogisticLoss < initialLogisticLoss)) throw new Error('One logistic-regression step must lower binary cross-entropy from zero weights');
  await page.locator('[data-action="logistic-train"]').click();
  if (!(await page.locator('.logistic-lab').innerText()).includes('точность train')) throw new Error('Logistic lab must expose train accuracy next to log-loss');
  await page.locator('[data-action="show-dataset"]').click();
  await page.waitForSelector('.dataset-profile-screen');
  if (await page.locator('.data-category-bars > div').count() !== 2) throw new Error('Logistic dataset profile must visualise binary target balance');
  await page.locator('[data-route="logistic"]').click();
  await page.locator('[data-theory-section="logistic-intro"]').click();
  await page.waitForSelector('#logistic-loss');
  if (!(await page.locator('#logistic-loss').innerText()).includes('log-likelihood')) throw new Error('Logistic theory must derive log-loss from Bernoulli likelihood');
  if (await page.locator('#logistic-likelihood-derivation .derivation-step').count() < 5) throw new Error('Logistic theory must derive binary cross-entropy from likelihood');
  if (!(await page.locator('#logistic-softmax').innerText()).includes('softmax')) throw new Error('Logistic theory must cover the multiclass softmax extension');
  if (!(await page.locator('#logistic-ranking-metrics').innerText()).includes('AUC-ROC')) throw new Error('Logistic theory must explain threshold-independent ranking metrics');
  if (!(await page.locator('#logistic-boundary').innerText()).includes('p(x)=0.5')) throw new Error('Logistic theory must connect score boundary to the probability threshold');
  await page.locator('[data-route="logistic"]').first().click();
  await page.locator('button.back').click();

  await openModule(page, 'knn');
  await page.waitForSelector('input[data-control="knn.k"]');
  await page.locator('input[data-control="knn.k"]').evaluate(input => {
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  if (!(await page.locator('[data-knn-result]').innerText()).includes('k=5')) throw new Error('KNN slider did not update prediction');
  await page.locator('select[data-control="knn.metric"]').selectOption('manhattan');
  if (await page.locator('[data-knn-point]').count() < 50) throw new Error('KNN visualisation was not retained after changing metric');
  if (await page.locator('[data-control="knn.scaling"]').count()) throw new Error('Scaling control must not be present in KNN yet');
  await page.locator('[data-theory-route="knn-theory"][data-theory-section="knn-distance"]').click();
  await page.waitForSelector('#knn-distance');
  if (!(await page.locator('.theory-sheet').innerText()).toLowerCase().includes('манхэттенская')) throw new Error('KNN theory must cover distance metrics');
  await page.locator('[data-route="knn"]').first().click();
  await page.locator('[data-knn-point]').first().click();
  await page.waitForSelector('.knn-popover');
  if (await page.locator('.knn-popover li').count() !== 5) throw new Error('Selected KNN object must show its nearest objects and distances');
  await page.locator('[data-action="close-knn-details"]').click();
  if (await page.locator('.knn-popover').count()) throw new Error('KNN neighbor card must close from its own button');
  await page.locator('[data-action="show-dataset"]').click();
  await page.waitForSelector('.dataset-profile-screen');
  if (await page.locator('.data-category-bars > div').count() !== 2) throw new Error('KNN dataset profile must visualise class balance');
  await page.locator('[data-route="knn"]').click();
  await page.locator('button.back').click();

  await openModule(page, 'tree');
  await page.waitForSelector('[data-tree-node]');
  if (await page.locator('[data-candidate]').count()) throw new Error('Candidate split panel must not be present in tree lab');
  await page.locator('[data-action="tree-auto"]').click();
  await page.waitForTimeout(2200);
  if (await page.locator('[data-tree-node]').count() < 4) throw new Error('Decision tree did not animate new vertices into the graph');
  const treeGraphBeforeSelection = await page.locator('.tree-graph').elementHandle();
  await page.locator('[data-tree-node]').first().click();
  await page.waitForSelector('.tree-node-popover');
  if (!(await treeGraphBeforeSelection.evaluate(node => node.isConnected))) throw new Error('Selecting a tree node must not rebuild the complete tree scene');
  if (!(await page.locator('.tree-node-popover').innerText()).includes('предикат')) throw new Error('A tree vertex must expose its predicate in a popover');
  await page.locator('[data-action="close-tree-node"]').click();
  if (await page.locator('.tree-node-popover').count()) throw new Error('Tree predicate card must close from its own button');
  await page.locator('[data-action="show-dataset"]').click();
  await page.waitForSelector('.dataset-profile-screen');
  if (await page.locator('.data-category-bars > div').count() !== 2) throw new Error('Tree dataset profile must visualise approval balance');
  await page.locator('[data-route="tree"]').click();
  await page.locator('[data-theory-route="tree-theory"][data-theory-section="tree-impurity"]').click();
  await page.waitForSelector('#tree-missing');
  if (!(await page.locator('#tree-missing').innerText()).includes('Surrogate split')) throw new Error('Tree theory must cover missing-value strategies');
  if (await page.locator('#tree-worked-split .derivation-step').count() < 5) throw new Error('Tree theory must include a complete worked impurity calculation');
  if (!(await page.locator('#tree-categorical').innerText()).includes('2M−1−1')) throw new Error('Tree theory must explain categorical split search');
  await page.locator('[data-route="tree"]').first().click();
  await page.locator('input[data-control="tree.depth"]').evaluate(input => {
    input.value = '1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (await page.locator('[data-output="tree.depth"]').innerText() !== '1') throw new Error('Decision-tree depth slider did not update');
  await page.locator('button.back').click();

  await openModule(page, 'svm');
  await page.waitForSelector('input[data-control="svm.c"]');
  if (await page.locator('.svm-point').count() < 50) throw new Error('SVM algorithm must render its generated two-class dataset');
  const initialObjective = Number((await page.locator('.svm-lab .empty-note').nth(1).innerText()).match(/J\(w\)\s+([\d.]+)/)?.[1]);
  await page.locator('[data-action="svm-step"]').click();
  const oneStepObjective = Number((await page.locator('.svm-lab .empty-note').nth(1).innerText()).match(/J\(w\)\s+([\d.]+)/)?.[1]);
  if (!(oneStepObjective < initialObjective)) throw new Error('One SVM subgradient step must lower the objective from the initial point');
  await page.locator('[data-action="svm-train"]').click();
  if (await page.locator('.svm-boundary').count() !== 1 || await page.locator('.svm-point.support').count() < 1) throw new Error('Trained SVM must draw a boundary and expose support vectors');
  await page.locator('[data-action="show-dataset"]').click();
  await page.waitForSelector('.dataset-profile-screen');
  if (await page.locator('.data-category-bars > div').count() !== 2) throw new Error('SVM dataset profile must visualise class balance');
  await page.locator('[data-route="svm"]').click();
  await page.locator('[data-theory-route="svm-theory"][data-theory-section="svm-intro"]').click();
  await page.waitForSelector('#svm-kernels');
  if (!(await page.locator('#svm-dual').innerText()).includes('KKT')) throw new Error('SVM theory must explain the dual problem and KKT conditions');
  if (await page.locator('#svm-margin-derivation .derivation-step').count() < 5) throw new Error('SVM theory must derive margin width from point-to-plane distance');
  if (await page.locator('#svm-dual-notation .notation-card dt').count() < 5) throw new Error('SVM theory must define dual and kernel notation');
  if (!(await page.locator('#svm-kernels').innerText()).includes('RBF')) throw new Error('SVM theory must explain kernel methods');
  if (!(await page.locator('#svm-generalization').innerText()).includes('Rademacher')) throw new Error('SVM theory must connect margin to generalisation complexity');
  if (!(await page.locator('#svm-causality').innerText()).includes('потенциальных исходов')) throw new Error('SVM theory must state the causal-inference boundary');
  await learningContext.close();
  await browser.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Passed user flows: onboarding, registration, profile, sequential module map, datasets, and five deep algorithm pages.');
} finally {
  server?.kill();
}
