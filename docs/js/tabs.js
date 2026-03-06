document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tabs').forEach((tabGroup) => {
    const buttons = tabGroup.querySelectorAll('.tab-btn');
    const contents = tabGroup.querySelectorAll('.tab-content');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;

        buttons.forEach((b) => b.classList.remove('active'));
        contents.forEach((c) => c.classList.remove('active'));

        btn.classList.add('active');
        tabGroup.querySelector(`#${target}`)?.classList.add('active');
      });
    });
  });
});
