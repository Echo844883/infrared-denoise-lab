import { phantom, addNoise, filter, metrics } from './core.js';

const reference = phantom();
const lesson = { step: 0, density: 12, method: 'median', saved: false };
const stages = [
  ['看懂参考图', '找一找右边的细竖线', '这是一幅用程序画出的灰度图。左边的矩形、右边的细线都是原本就有的细节。记住细线的位置，稍后看看去噪会不会把它一起擦掉。'],
  ['添加噪声', '让黑点和白点出现', '拖动噪声密度，比较两张图。设为 0% 时它们完全相同。逐渐增加密度，观察原本平滑的区域出现了什么。'],
  ['去噪并保存', '比较哪种方法保留了细节', '切换滤波方法，观察黑白点和右侧细线。你可以返回上一步调整噪声，再回来比较。满意后保存这组实验。']
];

function frame(caption, id) {
  return '<figure><canvas width="96" height="96" id="' + id + '" aria-label="' + caption + '"></canvas><figcaption>' + caption + '</figcaption></figure>';
}

export function tutorial() {
  const { step, density, method, saved } = lesson;
  const compare = step === 0 ? '局部放大 · 细竖线' : step === 1 ? '含噪图' : '去噪结果';
  return `<div class="learn"><header class="learn-head"><p class="learn-kicker">新手教程</p><h1>动手给一张图去噪</h1><p>从一张干净的图开始，给它加一点噪声，再试着去掉它。你只需要观察、拖动和比较。</p><a href="#overview">直接进入研究概览 →</a></header>
    <section class="lesson-box" aria-label="第一次去噪实验"><nav class="lesson-steps" aria-label="教程步骤">${stages.map(([label], i) => `<button type="button" data-step="${i}" ${step === i ? 'aria-current="step"' : ''}>${i + 1} · ${label}</button>`).join('')}</nav>
    <div class="lesson-body"><div class="lesson-copy"><h2 id="stepHeading" tabindex="-1">${stages[step][1]}</h2><p>${stages[step][2]}</p>
    ${step === 1 ? `<label>椒盐噪声密度 <output id="densityValue">${density}%</output><input type="range" id="lessonDensity" min="0" max="60" value="${density}"></label>` : ''}
    ${step === 2 ? `<label>去噪方法<select id="lessonMethod"><option value="median" ${method === 'median' ? 'selected' : ''}>中值滤波</option><option value="mean" ${method === 'mean' ? 'selected' : ''}>均值滤波</option></select></label><p id="methodHint"></p>` : ''}
    <div class="lesson-actions">${step < 2 ? `<button class="primary" data-step="${step + 1}">${step === 0 ? '试着添加噪声' : '试着去噪'} →</button>` : `<button id="lessonSave" class="primary" ${saved ? 'disabled' : ''}>${saved ? '已保存这组实验' : '保存这组实验'}</button><a href="#experiments">查看实验记录 →</a>`}</div></div>
    <div class="lesson-images">${frame(step === 2 ? '含噪图' : '参考图', 'lessonInput')}${frame(compare, 'lessonOutput')}</div></div></section>
    <div class="learn-next"><div><h2>为什么这样处理有效？</h2><p>用九个像素看懂灰度、噪声、均值和中值。</p></div><a href="#knowledge">进入去噪基础 →</a></div>
    <details class="learn-help"><summary>接下来怎么使用研究台？</summary><p>到<a href="#algorithms">算法对比</a>试试其他噪声，展开「实验设置与保存」可以载入自己的参考图。到<a href="#experiments">实验评估</a>找回保存的结果。记录存在当前浏览器，换设备前先点「导出备份」，再到新设备的「研究资料库」导入。</p></details></div>`;
}

function paint(id, values, crop = false) {
  const ctx = document.getElementById(id).getContext('2d');
  const image = ctx.createImageData(96, 96);
  for (let i = 0; i < values.length; i++) {
    const index = crop ? (36 + Math.floor(i / 96 / 4)) * 96 + 68 + Math.floor(i % 96 / 4) : i;
    const v = values[index];
    image.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
}

export function bindTutorial(onSave) {
  const byId = id => document.getElementById(id);
  let snapshot;
  function draw() {
    const noisy = addNoise(reference, 'salt', lesson.density, 42);
    const output = filter(noisy, 96, 96, lesson.method);
    snapshot = { reference, source: '合成灰度测试图', type: 'salt', level: lesson.density, method: lesson.method, seed: 42, threshold: 30 };
    paint('lessonInput', lesson.step === 2 ? noisy : reference);
    paint('lessonOutput', [reference, noisy, output][lesson.step], lesson.step === 0);
    if (byId('methodHint')) byId('methodHint').textContent = lesson.method === 'median' ? '九个值排序后取中间值。孤立的亮点会变暗，较细的亮线也可能消失。' : '九个值加起来除以九。亮点摊到了周围，边缘看起来也更模糊。';
    return output;
  }
  draw();
  document.querySelectorAll('[data-step]').forEach(button => {
    button.onclick = () => {
      lesson.step = Number(button.dataset.step);
      document.querySelector('.learn').outerHTML = tutorial();
      bindTutorial(onSave);
      byId('stepHeading').focus();
    };
  });
  if (byId('lessonDensity')) byId('lessonDensity').oninput = event => {
    lesson.density = Number(event.target.value);
    lesson.saved = false;
    byId('densityValue').textContent = lesson.density + '%';
    draw();
  };
  if (byId('lessonMethod')) byId('lessonMethod').onchange = event => {
    lesson.method = event.target.value;
    lesson.saved = false;
    byId('lessonSave').disabled = false;
    byId('lessonSave').textContent = '保存这组实验';
    draw();
  };
  if (byId('lessonSave')) byId('lessonSave').onclick = event => {
    const output = draw();
    onSave(snapshot, { m: metrics(reference, output, 96, 96) });
    lesson.saved = true;
    event.target.disabled = true;
    event.target.textContent = '已保存这组实验';
  };
}

const glossary = [
  ['红外图像与灰度', '红外传感器接收红外辐射，程序把测得的数值映射成亮暗。这里用 8 位灰度表示一个像素：0 是黑，255 是白。示例图是合成图，没有温度标定，亮度不能直接当作温度。'],
  ['信号、噪声与细节', '信号是你希望保留的信息，例如物体的轮廓。噪声是干扰测量的变化。一个亮点可能是噪声，也可能是真实小物体；比较参考图、连续帧或测量条件才能进一步判断。'],
  ['椒盐、高斯与条纹噪声', '椒盐噪声把一些像素替换为极黑或极白；高斯噪声给亮度加上随机起伏；列条纹让若干整列偏亮或偏暗。在算法对比页切换噪声类型，可观察三者的外观。'],
  ['窗口与滤波', '把目标像素和周围一圈放进一个 3×3 方格，就得到九个数。滤波器根据这些数算出新的中心值，再把窗口移向下一个像素。'],
  ['均值、中值与开关中值', '均值把九个数相加后除以九，本程序取最近整数。中值把九个数排序后取第五个。本站的开关中值只在中心是 0 或 255 且与中值的差超过阈值时替换它，其余位置保留原值。'],
  ['参考图、PSNR 与 SSIM', '参考图是本实验加噪前的图。PSNR 衡量像素误差，同一参考图下越高表示均方误差越小，完全相同显示 ∞。SSIM 衡量局部亮度、对比度和结构的一致性，本站按 8×8 小块计算，完全相同为 1。比较分数时也要观察细线和边缘。']
];

export function knowledge() {
  return `<div class="learn"><header class="learn-head"><p class="learn-kicker">去噪基础</p><h1>从一个像素看懂滤波</h1><p>假设一小块墙面原本都是灰度 80。让中心点变亮或变暗，看看两种方法怎样估计它原来的亮度。</p></header>
    <section class="lesson-box pixel-lab"><div><h2>改变中心像素</h2><p>周围八个像素固定为 80。</p><label for="centerGray">中心灰度 <output id="grayValue">255</output></label><input id="centerGray" type="range" min="0" max="255" value="255"><div class="lesson-actions"><button data-gray="80">恢复墙面</button><button data-gray="255">添加白点</button><button data-gray="0">添加黑点</button></div></div>
    <div><div class="learn-grid" aria-label="九个像素的灰度值">${Array.from({length:9}, (_,i) => i === 4 ? '<b id="centerCell">255</b>' : '<span>80</span>').join('')}</div></div>
    <div class="pixel-results" aria-live="polite"><p>均值滤波 <strong id="pixelMean"></strong></p><p>中值滤波 <strong id="pixelMedian"></strong></p><p id="pixelWhy"></p></div></section>
    <section class="learn-help"><h2>基础概念与方法</h2>${glossary.map(([term, definition]) => `<details><summary>${term}</summary><p>${definition}</p></details>`).join('')}</section>
    <div class="learn-next"><a href="#guide">回到新手教程</a><a href="#basics">观察窗口怎样滑动 →</a></div></div>`;
}

export function bindKnowledge() {
  const slider = document.getElementById('centerGray');
  function update() {
    const value = Number(slider.value);
    const patch = new Uint8Array(9).fill(80);
    patch[4] = value;
    const cell = document.getElementById('centerCell');
    cell.style.background = `rgb(${value} ${value} ${value})`;
    cell.style.color = value < 120 ? 'white' : 'black';
    cell.textContent = document.getElementById('grayValue').textContent = value;
    const mean = filter(patch,3,3,'mean')[4];
    document.getElementById('pixelMean').textContent = mean;
    document.getElementById('pixelMedian').textContent = filter(patch,3,3,'median')[4];
    document.getElementById('pixelWhy').textContent = `均值： (8 × 80 + ${value}) ÷ 9，取整得 ${mean}。排序后第五个数仍是 80。`;
  }
  slider.oninput = update;
  document.querySelectorAll('[data-gray]').forEach(button => {
    button.onclick = () => { slider.value = button.dataset.gray; update(); };
  });
  update();
}
