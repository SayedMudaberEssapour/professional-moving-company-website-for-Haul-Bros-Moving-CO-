(() => {
    const list = document.getElementById('customer-reviews');
    if (!list) return;

    const reviews = Array.from(list.querySelectorAll('.customer-review'));
    const navigation = document.getElementById('review-pagination');
    const previous = document.getElementById('review-previous');
    const next = document.getElementById('review-next');
    const status = document.getElementById('review-page-status');
    const pageSize = 6;
    const pages = Math.ceil(reviews.length / pageSize);
    let page = 0;

    function render(moveFocus) {
        const start = page * pageSize;
        reviews.forEach((review, index) => {
            review.hidden = index < start || index >= start + pageSize;
            if (review.hidden) review.querySelector('details').open = false;
        });
        previous.disabled = page === 0;
        next.disabled = page >= pages - 1;
        status.textContent = `${start + 1}–${Math.min(start + pageSize, reviews.length)} of ${reviews.length} reviews · Page ${page + 1} of ${pages}`;
        if (moveFocus) {
            list.focus({ preventScroll: true });
            list.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
    }

    if (!reviews.length) return;
    previous.addEventListener('click', () => {
        if (page === 0) return;
        page -= 1;
        render(true);
    });
    next.addEventListener('click', () => {
        if (page >= pages - 1) return;
        page += 1;
        render(true);
    });
    navigation.hidden = pages <= 1;
    render(false);
})();
