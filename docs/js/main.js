document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const progressBar = document.querySelector('.scroll-progress');
  const backToTop = document.querySelector('.back-to-top');

  // Single consolidated scroll handler with rAF throttle
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        header.classList.toggle('scrolled', scrollY > 50);
        if (progressBar) {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          progressBar.style.width = (docHeight > 0 ? (scrollY / docHeight) * 100 : 0) + '%';
        }
        if (backToTop) backToTop.classList.toggle('visible', scrollY > 500);
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Scroll reveal
  const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );
  document.querySelectorAll('.reveal, .reveal-children').forEach((el) => revealObserver.observe(el));

  // Card deal animation (#10) - observe the track container
  const track = document.querySelector('.features-track');
  if (track) {
    const dealObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          track.querySelectorAll('.card-deal').forEach((card, i) => {
            setTimeout(() => card.classList.add('dealt'), i * 120);
          });
          dealObserver.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    dealObserver.observe(track);
  }

  // Active nav link highlighting
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
        }
      });
    },
    { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
  );
  document.querySelectorAll('section[id]').forEach((s) => navObserver.observe(s));

  // Stat counters (#11)
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'), 10);
          const suffix = el.getAttribute('data-suffix') || '';
          el.classList.add('odometer-animating');
          let current = 0;
          const interval = setInterval(() => {
            current += Math.max(1, Math.floor(target / 20));
            if (current >= target) { current = target; clearInterval(interval); el.classList.remove('odometer-animating'); }
            el.textContent = current.toLocaleString() + suffix;
          }, 40);
          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll('.odometer[data-target]').forEach((el) => counterObserver.observe(el));

  // Copy buttons with personality (#8)
  const quips = ['Snagged it!', 'In your clipboard.', 'Go deploy.', 'Bug hunting starts now.', "ctrl+v when ready, chief."];
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pre = btn.closest('.code-block')?.querySelector('pre');
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent).then(() => {
        btn.textContent = quips[Math.floor(Math.random() * quips.length)];
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2500);
      });
    });
  });

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        document.querySelector('.nav')?.classList.remove('open');
        document.querySelector('.hamburger')?.classList.remove('active');
      }
    });
  });
});
