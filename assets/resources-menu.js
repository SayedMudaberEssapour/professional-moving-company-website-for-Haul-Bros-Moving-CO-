// Resolve from this script so links work at any page depth and in file previews.
(() => {
  const script = document.currentScript;
  if (!script) return;
  const root = new URL('../', script.src);
  const locations = [["Aldie, VA","Locations/Aldie/"],["Alexandria, VA","Locations/Alexandria/"],["Annandale, VA","Locations/Annandale/"],["Arlington, VA","Locations/Arlington/"],["Ashburn, VA","Locations/Ashburn/"],["Bealeton, VA","Locations/Beleaton/"],["Bethesda, MD","Locations/Bethesda/"],["Bowie, MD","Locations/Bowie/"],["Brambleton, VA","Locations/Brambleton/"],["Broadlands, VA","Locations/Broadlands/"],["Burke, VA","Locations/Burke/"],["Cascades, VA","Locations/Cascades/"],["Centreville, VA","Locations/Centreville/"],["Chantilly, VA","Locations/Chantilly/"],["Clifton, VA","Locations/Clifton/"],["Countryside, VA","Locations/Countryside/"],["Culpeper, VA","Locations/Culpeper/"],["Dale City, VA","Locations/Dale_City/"],["Dumfries, VA","Locations/Dumfries_VA/"],["Dunn Loring, VA","Locations/Dunn_Loring/"],["Fairfax Station, VA","Locations/Fairfax_Station/"],["Fairfax, VA","Locations/Fairfax/"],["Falls Church, VA","Locations/Fallschurch/"],["Fort Hunt, VA","Locations/Fort_Hunt/"],["Franconia, VA","Locations/Franconia/"],["Fredericksburg, VA","Locations/Fredericksburg/"],["Gainesville, VA","Locations/Gainesville/"],["Gaithersburg, MD","Locations/Gaithersburg/"],["Germantown, MD","Locations/Germantown/"],["Great Falls, VA","Locations/GreatFalls/"],["Hamilton, VA","Locations/Hamilton/"],["Haymarket, VA","Locations/Haymarket/"],["Herndon, VA","Locations/Herndon/"],["Hillsboro, VA","Locations/Hillsboro/"],["Huntington, VA","Locations/Huntington/"],["Kingstowne, VA","Locations/Kingstowne/"],["Lake Ridge, VA","Locations/Lake_ridge/"],["Lansdowne, VA","Locations/Lansdowne/"],["Leesburg, VA","Locations/Leesburg/"],["Lorton, VA","Locations/Lorton/"],["Lovettsville, VA","Locations/Lovettsville/"],["Manassas, VA","Locations/Manassas/"],["McLean, VA","Locations/McLean/"],["Merrifield, VA","Locations/Merrifield/"],["Middleburg, VA","Locations/Middleburg/"],["Mount Vernon, VA","Locations/Mount_Vernon/"],["National Harbor, MD","Locations/National_Harbor/"],["Newington, VA","Locations/Newington/"],["North Springfield, VA","Locations/North_Springfield/"],["Oakton, VA","Locations/Oakton/"],["Occoquan, VA","Locations/Occoquan/"],["Oxon Hill, MD","Locations/Oxon_Hill/"],["Purcellville, VA","Locations/Purcellville/"],["Reston, VA","Locations/Reston/"],["Rockville, MD","Locations/Rockville/"],["Round Hill, VA","Locations/Round_Hill/"],["Silver Spring, MD","Locations/Silver_Spring/"],["South Riding, VA","Locations/South_Riding/"],["Springfield, VA","Locations/Springfield/"],["Sterling, VA","Locations/Sterling/"],["Stone Ridge, VA","Locations/Stone_Ridge/"],["Triangle, VA","Locations/Triangle/"],["Tysons, VA","Locations/Tysons/"],["Upper Marlboro, MD","Locations/Upper_Marlboro/"],["Vienna, VA","Locations/Vienna/"],["Waldorf, MD","Locations/Waldorf/"],["Washington, D.C.","Locations/Washington_DC/"],["West Springfield, VA","Locations/West_Springfield/"],["Woodbridge, VA","Locations/woodbridge-movers/"]];
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
    let pinned = false;
    const hover = () => window.matchMedia('(hover: hover) and (min-width: 1024px)').matches;
    menu.addEventListener('mouseenter', () => { if (hover()) menu.open = true; });
    menu.addEventListener('mouseleave', () => { if (hover() && !pinned) menu.open = false; });
    summary.addEventListener('click', event => {
      event.preventDefault();
      pinned = !pinned;
      menu.open = pinned;
    });
    menu.addEventListener('toggle', () => { if (!menu.open) pinned = false; });
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
