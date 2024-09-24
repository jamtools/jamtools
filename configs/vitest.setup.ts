import '@testing-library/jest-dom';

class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

class IntersectionObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
    takeRecords() {
        return [];
    }
}

global.ResizeObserver = ResizeObserver;
global.IntersectionObserver = IntersectionObserver as any;
