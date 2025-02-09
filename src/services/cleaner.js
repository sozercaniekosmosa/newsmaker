import {noSQL} from "../DB/noSQL.js";
import {findExtFiles, pathResolveRoot, removeFile} from "../utils.js";
import {resolve} from "path";
import _ from "lodash";

const db = new noSQL('./dbNews.json');

const arrNews = db.getAll();
// console.log(arrNews)
// const pathRoot = process.cwd();
// const pathRoot = process.cwd();

// await clearImage(arrNews, 'D:/Dev/JS/Prj/2024/newsmaker');

export async function clearImage(arrImgPath, pathSrcImg) {
    try {
        const _arrImgExist = await findExtFiles(global.getImagePath(pathSrcImg), 'png', false);
        const arrImgExist = _arrImgExist.map(src => src.split('\\').reverse()[0])

        if (arrImgExist.length === 0) return;

        const _arrImg = arrImgPath.map(path => path.split('?')[0])

        const arrImgPathToRemove = _.difference(arrImgExist, _arrImg)
        if (arrImgPathToRemove.length === 0) return;

        for (let j = 0; j < arrImgPathToRemove.length; j++) {
            try {
                await removeFile(global.getImagePath(pathSrcImg, arrImgPathToRemove[j]))
            } catch (error) {
                console.error('can\'t remove: ' + imgPath)
            }
        }
    } catch (error) {
        console.error('xxxx')
    }
}

export async function clearImageAll(pathSrc) {
    const arr = global.dbNews.getAll().filter(it => it.arrImg.length > 0).map(it => {
        return {arrImg: it.arrImg, pathSrc: it.pathSrc};
    })
    for (let i = 0; i < arr.length; i++) {
        const {arrImg, pathSrc} = arr[i];
        await clearImage(arrImg, pathSrc)
    }
    console.log(arr)
}

// setTimeout(clearImageAll, 100);


export async function removeImageDir(pathSrc) {
    try {
        const arrImgExist = await findExtFiles(resolve(global.root, pathSrc), 'png', false);

        if (arrImgExist.length === 0) return;

        for (let j = 0; j < arrImgExist.length; j++) {
            const imgPath = arrImgExist[j];
            try {
                await removeFile(imgPath)
            } catch (error) {
                ERR('can\'t remove: ' + imgPath)
                console.error('can\'t remove: ' + imgPath)
            }
        }
    } catch (error) {
        throw error;
    }
}





