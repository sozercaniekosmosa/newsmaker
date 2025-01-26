export function loadImage(nodeImgage, src) {
    try {
        return new Promise((resolve, reject) => {
            nodeImgage.src = src;
            nodeImgage.onload = () => resolve(null)
            nodeImgage.onerror = () => reject(null)
        });
    } catch (e) {
        console.log(e)
        return new Promise((p) => p(null))
    }
}

export function loadVideo(nodeVideo, src) {
    try {
        return new Promise((resolve, reject) => {
            nodeVideo.src = src;
            nodeVideo.onload = () => resolve(null)
            nodeVideo.onerror = () => reject(null)
        });
    } catch (e) {
        console.log(e)
        return new Promise((p) => p(null))
    }
}