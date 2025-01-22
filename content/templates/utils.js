export function loadImage(nodeImgage, src) {
    try {
        return new Promise((resolve, reject) => {
            nodeImgage.src = src;
            nodeImgage.onload = () => resolve(null)
            nodeImgage.onerror = () => reject(null)
        });
    } catch (e) {
        console.log(e)
    } finally {
        return new Promise((p) => p(null))
    }
}