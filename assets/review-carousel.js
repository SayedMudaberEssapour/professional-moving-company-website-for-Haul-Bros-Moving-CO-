(() => {
  const viewport = document.getElementById('review-viewport');
  if (!viewport) return;
  const track = viewport.querySelector('.review-track');
  const pauseButton = document.getElementById('reviews-pause');
  const originalCards = [...track.children];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let hovered = false;
  let visible = false;
  let position = viewport.scrollLeft;
  let lastTime = 0;
  // Decorative copies allow the row to loop without duplicating keyboard stops.
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    track.appendChild(clone);
  });
  const loopWidth = () => track.children[originalCards.length].offsetLeft - originalCards[0].offsetLeft;
  function updateButton() {
    pauseButton.textContent = paused ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', `${paused ? 'Resume' : 'Pause'} automatic review scrolling`);
  }
  function stop() { paused = true; updateButton(); }
  pauseButton.addEventListener('click', () => { paused = !paused; position = viewport.scrollLeft; updateButton(); });
  viewport.addEventListener('mouseenter', () => { hovered = true; });
  viewport.addEventListener('mouseleave', () => { hovered = false; position = viewport.scrollLeft; });
  viewport.addEventListener('focusin', stop);
  viewport.addEventListener('pointerdown', stop, { passive:true });
  viewport.addEventListener('wheel', stop, { passive:true });
  viewport.addEventListener('scroll', () => {
    const limit = loopWidth();
    if (limit && viewport.scrollLeft >= limit) viewport.scrollLeft -= limit;
    position = viewport.scrollLeft;
  }, { passive:true });
  function step(direction) {
    stop();
    const size = originalCards[0].getBoundingClientRect().width + 24;
    const limit = loopWidth();
    const current = viewport.scrollLeft / size;
    const desired = (direction > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1) * size;
    const target = ((desired % limit) + limit) % limit;
    const wraps = desired < 0 || desired >= limit;
    viewport.scrollTo({left:target, behavior:motion.matches || wraps ? 'instant' : 'smooth'});
  }
  document.getElementById('reviews-prev').addEventListener('click', () => step(-1));
  document.getElementById('reviews-next').addEventListener('click', () => step(1));
  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  motion.addEventListener('change', () => { if (motion.matches) stop(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, {threshold:0.1}).observe(viewport);
  function animate(time) {
    const delta = Math.min(time - (lastTime || time), 50);
    lastTime = time;
    if (!paused && !hovered && visible && !document.hidden) {
      position += delta * .035;
      const limit = loopWidth();
      if (limit && position >= limit) position -= limit;
      viewport.scrollLeft = position;
    }
    requestAnimationFrame(animate);
  }
  updateButton();
  requestAnimationFrame(animate);
})();
