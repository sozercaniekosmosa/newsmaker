import {loadImage} from "../utils.js";

window.render = async (data) => {
    debugger
    document.querySelector('.foreign-text').innerHTML = data?.text ?? 'Something text for fun';
    const nodeImg = document.querySelector('.back-img')

    data?.img && await loadImage(nodeImg, data?.img)

    return 0;
}
window.render()
