/* Native form fallback works without JavaScript; enhanced status stays on page. */
(() => {
  document.querySelectorAll('.blog-estimate-form').forEach((form) => {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        document.body.classList.toggle('blog-quote-in-view', entry.isIntersecting);
      }).observe(form.closest('.blog-hero-quote'));
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.blog-form-status');
      if (button.disabled) return;
      const label = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Sending your request…';
      status.textContent = '';
      delete status.dataset.error;
      try {
        const response = await fetch(form.action, {
          method: 'POST', body: new FormData(form), headers: {Accept: 'application/json'}
        });
        if (!response.ok) throw new Error('Request failed');
        form.reset();
        status.textContent = 'Thank you! Your request has been sent. Our team will contact you to discuss your move.';
      } catch (_) {
        status.dataset.error = 'true';
        status.textContent = 'Your request could not be sent. Please try again or call 571-899-1919.';
      } finally {
        button.disabled = false;
        button.innerHTML = label;
      }
    });
  });
})();
