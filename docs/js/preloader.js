(function () {
  const statusEl = document.getElementById('preloader-status');
  const barFill = document.getElementById('preloader-bar-fill');
  const pctEl = document.getElementById('preloader-pct');
  const preloader = document.getElementById('preloader');
  const emojiEl = document.getElementById('preloader-emoji');

  if (!preloader) return;

  // Slack-style emojis that cycle during loading
  const emojis = [
    '\u{1F41B}', // bug
    '\u{1F50D}', // magnifying glass
    '\u{1F4AC}', // speech bubble (Slack)
    '\u{1F9E0}', // brain (AI)
    '\u{26A1}',  // lightning
    '\u{1F4CA}', // chart
    '\u{1F527}', // wrench (MCP)
    '\u{1F680}', // rocket
    '\u{2705}',  // check mark
    '\u{1F4E1}', // satellite (polling)
    '\u{1F4DA}', // books (RAG)
    '\u{1F4C8}', // trending up
    '\u{1F4E6}', // package (deploy)
    '\u{1F389}', // party popper
  ];

  let emojiIdx = 0;
  let emojiTimer = null;

  function cycleEmoji() {
    if (!emojiEl) return;
    emojiEl.classList.add('preloader-emoji-exit');
    setTimeout(() => {
      emojiIdx = (emojiIdx + 1) % emojis.length;
      emojiEl.textContent = emojis[emojiIdx];
      emojiEl.classList.remove('preloader-emoji-exit');
      emojiEl.classList.add('preloader-emoji-enter');
      setTimeout(() => emojiEl.classList.remove('preloader-emoji-enter'), 300);
    }, 200);
  }

  emojiTimer = setInterval(cycleEmoji, 400);

  const statuses = [
    { at: 0, text: 'Initializing...' },
    { at: 12, text: 'Loading assets...' },
    { at: 28, text: 'Connecting to Slack...' },
    { at: 45, text: 'Scanning for bugs...' },
    { at: 60, text: 'Bug detected. Analyzing...' },
    { at: 75, text: 'Loading LLM models...' },
    { at: 88, text: 'MCP tools ready.' },
    { at: 95, text: 'Locking on target...' },
    { at: 100, text: 'Launching BugZooka.' },
  ];

  let progress = 0;
  let statusIdx = 0;

  function tick() {
    const remaining = 100 - progress;
    const increment = Math.max(0.5, remaining * 0.06 + Math.random() * 1.5);
    progress = Math.min(100, progress + increment);

    const rounded = Math.floor(progress);
    barFill.style.width = rounded + '%';
    pctEl.textContent = rounded + '%';

    while (statusIdx < statuses.length && rounded >= statuses[statusIdx].at) {
      statusEl.textContent = statuses[statusIdx].text;
      statusIdx++;
    }

    if (progress < 100) {
      setTimeout(tick, 30 + Math.random() * 40);
    } else {
      finishLoading();
    }
  }

  function finishLoading() {
    clearInterval(emojiTimer);
    // Land on rocket for launch
    if (emojiEl) emojiEl.textContent = '\u{1F680}';

    setTimeout(() => {
      preloader.classList.add('preloader-done');
      setTimeout(() => {
        document.body.classList.remove('loading');
        preloader.remove();
      }, 800);
    }, 400);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(tick);
  });
})();
