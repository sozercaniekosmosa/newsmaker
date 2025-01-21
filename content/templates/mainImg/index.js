import {loadImage} from "../utils.js";


window.render = async (data) => {
    debugger
    const nodeText = document.querySelector('.text-title')
    const nodeImg = document.querySelector('.back-img')

    nodeText.innerHTML = data?.mainTitle ?? 'Something text for fun';
    await loadImage(nodeImg, data?.img)
}
window.render()
