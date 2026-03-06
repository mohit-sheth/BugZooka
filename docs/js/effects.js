document.addEventListener('DOMContentLoaded', () => {
  // === #1: Logo Bug Squash Easter Egg ===
  const logo = document.getElementById('logo-btn');
  const overlay = document.getElementById('bug-squash-overlay');
  let clickCount = 0, clickTimer = null;

  if (logo && overlay) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 800);
      if (clickCount >= 5) {
        clickCount = 0;
        overlay.hidden = false;
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.add('squashed'), 600);
        setTimeout(() => overlay.classList.add('show-text'), 1000);
        setTimeout(() => {
          overlay.classList.remove('active', 'squashed', 'show-text');
          overlay.hidden = true;
        }, 3000);
      }
    });
  }

  // === #5: Konami Code Easter Egg ===
  const konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        const msg = document.createElement('div');
        msg.className = 'konami-msg';
        msg.textContent = "You've unleashed the swarm. BugZooka is on it.";
        document.body.appendChild(msg);
        setTimeout(() => msg.classList.add('visible'), 50);
        setTimeout(() => { msg.classList.remove('visible'); setTimeout(() => msg.remove(), 500); }, 4000);
      }
    } else {
      konamiIndex = 0;
    }
  });

  // === 3D tilt on cards (using CSS custom properties to avoid transform conflicts) ===
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--tilt-x', (((e.clientY - rect.top - rect.height / 2) / rect.height) * -8) + 'deg');
      card.style.setProperty('--tilt-y', (((e.clientX - rect.left - rect.width / 2) / rect.width) * 8) + 'deg');
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });

  // === #7: Architecture Play Button ===
  const archPlayBtn = document.getElementById('arch-play-btn');
  const archFlow = document.getElementById('arch-flow');
  if (archPlayBtn && archFlow) {
    archPlayBtn.addEventListener('click', () => {
      const nodes = archFlow.querySelectorAll('.arch-node');
      const arrows = archFlow.querySelectorAll('.arch-arrow');
      nodes.forEach(n => n.classList.remove('arch-active'));
      arrows.forEach(a => a.classList.remove('arch-active'));
      let step = 0;
      (function nextStep() {
        if (step < nodes.length) {
          nodes[step].classList.add('arch-active');
          if (step > 0) arrows[step - 1].classList.add('arch-active');
          step++;
          setTimeout(nextStep, 600);
        }
      })();
    });
  }

  // === #14: Command Table Hover Preview ===
  const previewBox = document.getElementById('command-preview');
  if (previewBox) {
    const previewBody = previewBox.querySelector('.command-preview-body');
    document.querySelectorAll('[data-preview]').forEach((row) => {
      row.addEventListener('mouseenter', () => {
        previewBody.textContent = row.getAttribute('data-preview').replace(/\\n/g, '\n');
        previewBox.classList.add('visible');
      });
      row.addEventListener('mouseleave', () => previewBox.classList.remove('visible'));
    });
  }

  // === #15: Day Mode Easter Egg ===
  const dayBtn = document.getElementById('day-mode-btn');
  const dayFlash = document.getElementById('day-mode-flash');
  if (dayBtn && dayFlash) {
    dayBtn.addEventListener('click', () => {
      dayFlash.hidden = false;
      document.body.style.background = '#ffffff';
      document.body.style.color = '#000';
      setTimeout(() => dayFlash.classList.add('active'), 50);
      setTimeout(() => {
        document.body.style.background = '';
        document.body.style.color = '';
        dayFlash.classList.remove('active');
        dayFlash.hidden = true;
      }, 2500);
    });
  }
});
