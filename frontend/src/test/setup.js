// jsdom doesn't implement these browser APIs
window.HTMLElement.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};
