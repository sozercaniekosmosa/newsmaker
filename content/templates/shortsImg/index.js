import {loadImage} from "../utils.js";


window.render = async (data) => {
    debugger
    const nodeText = document.querySelector('.text-title')
    const nodeImgBack = document.querySelector('.back-img')
    const nodeImgLogo = document.querySelector('.logo-img')

    nodeText.innerHTML = data?.text ?? 'Something text for fun';
    await loadImage(nodeImgLogo, '/content/img/logo-lg.png')
    data?.img && await loadImage(nodeImgBack, data?.img)
}
window.render()
