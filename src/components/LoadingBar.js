import { el } from '../utils/dom.js';

export function createLoadingBar() {
  const wrap = el('div', { class: 'loaderbar', style: 'opacity:0;' });
  const bar = el('div', { class: 'bar' });
  wrap.appendChild(bar);

  let timer = null;
  let running = false;

  function start() {
    if (running) return;
    running = true;
    wrap.style.opacity = '1';
    bar.style.width = '0%';

    let p = 0;
    const tick = () => {
      if (!running) return;
      p = Math.min(88, p + (5 + Math.random() * 10));
      bar.style.width = `${p}%`;
      timer = setTimeout(tick, 240);
    };
    tick();
  }

  function stop() {
    if (!running) return;
    running = false;
    if (timer) clearTimeout(timer);
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.width = '0%';
      wrap.style.opacity = '0';
    }, 260);
  }

  return { element: wrap, start, stop };
}

