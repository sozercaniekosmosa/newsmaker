export function loadImage(nodeImgage, src) {
    return new Promise((resolve) => {
        nodeImgage.src = src;
        nodeImgage.onload = () => resolve(null)
    });
}