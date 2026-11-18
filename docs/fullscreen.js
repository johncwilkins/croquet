export function initFullscreen(button, notice, onResize) {
  const root = document.documentElement;
  const active = () => document.fullscreenElement || document.webkitFullscreenElement;
  const enter = root.requestFullscreen || root.webkitRequestFullscreen;
  const leave = document.exitFullscreen || document.webkitExitFullscreen;

  function update() {
    const isFull = !!active();
    const label = isFull ? 'Exit fullscreen' : 'Enter fullscreen';
    button.setAttribute('aria-pressed', String(isFull));
    button.setAttribute('aria-label', label);
    button.title = isFull ? 'Exit fullscreen (Esc)' : label;
    button.innerHTML = '⛶ <span>' + (isFull ? 'Exit fullscreen' : 'Fullscreen') + '</span>';
    onResize();
  }

  button.addEventListener('click', async () => {
    if (active()) {
      try {
        if (leave) await leave.call(document);
        else notice('Use Esc to leave fullscreen.');
      } catch {
        notice('Use Esc to leave fullscreen.');
      }
    } else if (!enter) {
      notice('Fullscreen is unavailable here. Try your browser’s fullscreen or Add to Home Screen.');
    } else {
      try {
        await enter.call(root);
      } catch {
        notice('Your browser blocked fullscreen. Open the game directly and try again.');
      }
    }
  });

  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  update();
}
