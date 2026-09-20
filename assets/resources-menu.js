// Resolve from this script so links work at any page depth and in file previews.
(() => {
  const script = document.currentScript;
  if (!script) return;
  const root = new URL('../', script.src);
  const locations = [["Aldie, VA","Locations/Aldie.html"],["Alexandria, VA","Locations/Alexandria.html"],["Annandale, VA","Locations/Annandale.html"],["Arlington, VA","Locations/Arlington.html"],["Ashburn, VA","Locations/Ashburn.html"],["Bealeton, VA","Locations/Beleaton.html"],["Bethesda, MD","Locations/Bethesda.html"],["Bowie, MD","Locations/Bowie.html"],["Brambleton, VA","Locations/Brambleton.html"],["Broadlands, VA","Locations/Broadlands.html"],["Burke, VA","Locations/Burke.html"],["Cascades, VA","Locations/Cascades.html"],["Centreville, VA","Locations/Centreville.html"],["Chantilly, VA","Locations/Chantilly.html"],["Clifton, VA","Locations/Clifton.html"],["Countryside, VA","Locations/Countryside.html"],["Culpeper, VA","Locations/Culpeper.html"],["Dale City, VA","Locations/Dale_City.html"],["Dumfries, VA","Locations/Dumfries_VA.html"],["Dunn Loring, VA","Locations/Dunn_Loring.html"],["Fairfax Station, VA","Locations/Fairfax_Station.html"],["Fairfax, VA","Locations/Fairfax.html"],["Falls Church, VA","Locations/Fallschurch.html"],["Fort Hunt, VA","Locations/Fort_Hunt.html"],["Franconia, VA","Locations/Franconia.html"],["Fredericksburg, VA","Locations/Fredericksburg.html"],["Gainesville, VA","Locations/Gainesville.html"],["Gaithersburg, MD","Locations/Gaithersburg.html"],["Germantown, MD","Locations/Germantown.html"],["Great Falls, VA","Locations/GreatFalls.html"],["Hamilton, VA","Locations/Hamilton.html"],["Haymarket, VA","Locations/Haymarket.html"],["Herndon, VA","Locations/Herndon.html"],["Hillsboro, VA","Locations/Hillsboro.html"],["Huntington, VA","Locations/Huntington.html"],["Kingstowne, VA","Locations/Kingstowne.html"],["Lake Ridge, VA","Locations/Lake_ridge.html"],["Lansdowne, VA","Locations/Lansdowne.html"],["Leesburg, VA","Locations/Leesburg.html"],["Lorton, VA","Locations/Lorton.html"],["Lovettsville, VA","Locations/Lovettsville.html"],["Manassas, VA","Locations/Manassas.html"],["McLean, VA","Locations/McLean.html"],["Merrifield, VA","Locations/Merrifield.html"],["Middleburg, VA","Locations/Middleburg.html"],["Mount Vernon, VA","Locations/Mount_Vernon.html"],["National Harbor, MD","Locations/National_Harbor.html"],["Newington, VA","Locations/Newington.html"],["North Springfield, VA","Locations/North_Springfield.html"],["Oakton, VA","Locations/Oakton.html"],["Occoquan, VA","Locations/Occoquan.html"],["Oxon Hill, MD","Locations/Oxon_Hill.html"],["Purcellville, VA","Locations/Purcellville.html"],["Reston, VA","Locations/Reston.html"],["Rockville, MD","Locations/Rockville.html"],["Round Hill, VA","Locations/Round_Hill.html"],["Silver Spring, MD","Locations/Silver_Spring.html"],["South Riding, VA","Locations/South_Riding.html"],["Springfield, VA","Locations/Springfield.html"],["Sterling, VA","Locations/Sterling.html"],["Stone Ridge, VA","Locations/Stone_Ridge.html"],["Triangle, VA","Locations/Triangle.html"],["Tysons, VA","Locations/Tysons.html"],["Upper Marlboro, MD","Locations/Upper_Marlboro.html"],["Vienna, VA","Locations/Vienna.html"],["Waldorf, MD","Locations/Waldorf.html"],["Washington, D.C.","Locations/Washington_DC.html"],["West Springfield, VA","Locations/West_Springfield.html"],["Woodbridge, VA","Locations/woodbridge-movers.html"]];
  function makeMenu() {
    const menu = document.createElement('details');
    menu.className = 'resources-menu moving-locations-menu';
    const summary = document.createElement('summary');
    summary.textContent = 'Moving Locations';
    const panel = document.createElement('div');
    panel.className = 'resources-options moving-locations-options';
    locations.forEach(([label, path]) => {
      const link = document.createElement('a');
      link.href = new URL(path, root).href;
      link.textContent = label;
      panel.append(link);
    });
    menu.append(summary, panel);
    return menu;
  }
  // Replace legacy dropdowns and quick-menu triggers with the same full list.
  document.querySelectorAll('header button, header summary').forEach(control => {
    if (!/^Moving Locations?\b/i.test(control.textContent.trim())) return;
    const details = control.closest('details');
    if (details) {
      details.replaceWith(makeMenu());
    } else if (!control.hasAttribute('aria-controls') && control.parentElement.tagName === 'LI') {
      control.parentElement.replaceChildren(makeMenu());
    } else {
      control.replaceWith(makeMenu());
    }
  });
  // Some service and article templates have no location control at all.
  document.querySelectorAll('header nav').forEach(nav => {
    if (nav.querySelector('.moving-locations-menu')) return;
    const list = nav.querySelector('ul');
    const menu = makeMenu();
    if (list) {
      const item = document.createElement('li');
      item.append(menu);
      list.append(item);
    } else {
      const container = nav.querySelector(':scope > div') || nav;
      container.append(menu);
    }
  });
})();

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
