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

export async function clearImage(arrImgPath, pathSrc) {
        try {
            const _arrImgExist = await findExtFiles(resolve(global.root, pathSrc), 'png', false);
            const arrImgExist = _arrImgExist.map(src => src.split('\\').reverse()[0])

            if (arrImgExist.length === 0) return;

            const _arrImg = arrImgPath.map(path => path.split('?')[0])

            const _arrImgPathToRemove = _.difference(arrImgExist, _arrImg)
            if (_arrImgPathToRemove.length === 0) return;

            const arrImgPathToRemove = _arrImgPathToRemove.map(path => resolve(global.root, pathSrc + path))

            for (let j = 0; j < arrImgPathToRemove.length; j++) {
                const imgPath = arrImgPathToRemove[j];
                try {
                    await removeFile(imgPath)
                } catch (error) {
                    console.error('can\'t remove: ' + imgPath)
                }
            }
        } catch (error) {
            console.error('xxxx')
        }
}





