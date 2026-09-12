document.querySelectorAll('.resources-menu').forEach(menu => {
  menu.addEventListener('toggle', () => {
    if (menu.open) document.querySelectorAll('.resources-menu').forEach(other => {
      if (other !== menu) other.open = false;
    });
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
});
document.addEventListener('click', event => {
  document.querySelectorAll('.resources-menu[open]').forEach(menu => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
