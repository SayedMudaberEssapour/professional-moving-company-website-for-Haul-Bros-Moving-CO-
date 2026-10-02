(() => {
  const header = document.querySelector('body > header');
  if (!header) return;
  const previous = header.previousElementSibling;
  const notice = previous && previous.textContent.includes('Discount Notice') ? previous : null;
  const spacer = document.createElement('div');
  spacer.setAttribute('aria-hidden', 'true');
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:50;width:100%;';
  (notice || header).before(spacer, banner);
  if (notice) banner.append(notice);
  banner.append(header);
  header.style.position = 'relative';
  header.style.top = '0';
  const update = () => {
    spacer.style.height = `${banner.getBoundingClientRect().height}px`;
    document.documentElement.style.scrollPaddingTop = spacer.style.height;
  };
  new ResizeObserver(update).observe(banner);
  update();
})();
