window.addEventListener('load', () => {
    const elements = Array.from(document.querySelectorAll('nav[aria-label="Header"] .md-header__title .md-ellipsis'));
    for (const element of elements) {
        element.setAttribute('style', 'cursor: pointer;');
        element.addEventListener('click', () => {
            location.pathname = '';
        });
    }
});
