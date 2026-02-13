(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.body.classList.toggle('reduce-motion', mediaQuery.matches);

  if (!mediaQuery.matches) {
    const onMove = (event) => {
      const x = (event.clientX / window.innerWidth) - 0.5;
      const y = (event.clientY / window.innerHeight) - 0.5;
      document.documentElement.style.setProperty('--cursor-x', x.toFixed(4));
      document.documentElement.style.setProperty('--cursor-y', y.toFixed(4));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
  }
})();
