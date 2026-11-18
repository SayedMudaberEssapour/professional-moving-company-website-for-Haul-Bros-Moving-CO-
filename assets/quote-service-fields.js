/* Keep conditional estimate questions scoped to each form. */
(() => {
  document.querySelectorAll('[data-quote-service-fields]').forEach((section) => {
    const form = section.closest('form');
    const service = section.querySelector('[name="service_type"]');
    const groups = [...section.querySelectorAll('[data-quote-group]')];
    const hint = section.querySelector('.quote-service-hint');
    function update() {
      const value = service.value;
      const kind = value === 'Commercial Moving' ? 'business'
        : value === 'Junk Removal' ? 'junk'
        : value === 'Storage Solutions' ? 'storage'
        : ['Furniture Disassembly & Reassembly', 'Specialty-Item Moving'].includes(value) ? 'items' : 'home';
      groups.forEach((group) => {
        group.hidden = group.dataset.quoteGroup !== kind;
        group.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = group.hidden; });
      });
      hint.textContent = value === 'Multiple Services' ? 'Choose your home size and list the services you need in the details below.'
        : kind === 'business' ? 'An approximate square footage is fine. Add inventory and building access details below.'
        : kind === 'junk' ? 'List the items for pickup. The team will confirm what can be accepted and provide an estimate.'
        : kind === 'storage' ? 'Tell us the amount and duration. Space, availability and pricing will be confirmed.' : '';
      // A delivery address is not always known or needed for these services.
      const destination = form.querySelector('[name="moving_to"]');
      if (destination) {
        destination.required = !['junk', 'storage', 'items'].includes(kind) && !['Packing Services', 'Unpacking Services'].includes(value);
        const label = form.querySelector(`label[for="${destination.id}"]`);
        if (label) label.textContent = destination.required ? 'Moving to (city or ZIP)' : 'Destination (city or ZIP, if known)';
      }
    }
    service.addEventListener('change', update);
    form.addEventListener('reset', () => setTimeout(update, 0));
    update();
  });
})();
