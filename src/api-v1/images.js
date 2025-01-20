import {findExtFiles, formatDateTime, pathResolveRoot, readFileAsync, removeFile, writeFileAsync} from "../utils.js";
import express from "express";
import {renderToBrowser, downloadImages, ImageDownloadProcessor} from "../parser.js";
import multer from "multer";
import {fileURLToPath} from "url";

const routerImage = express.Router();

routerImage.get('/remove-image', async (req, res) => {
    try {
        const {path} = req.query;
        await removeFile('./public/public/' + path.replaceAll(/\\/g, '/'))
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})
routerImage.get('/images', async (req, res) => {
    const {prompt, max, id, timeout} = req.query;
    try {
        const news = global.dbNews.getByID(id);
        const ip = new ImageDownloadProcessor()
        const arrUrl = (await ip.getArrImage(prompt)).slice(0, max)
        res.status(200).send({arrUrl, id})
        await downloadImages({
            arrUrl, outputDir: `./public/public/${news.pathSrc}/`, pfx: '', ext: '.png', count: +max, timeout
        })
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
const upload = multer();
routerImage.post('/save-image', upload.single('image'), async (req, res) => {
    try {
        const {body: {path}} = req;
        const data = req.file.buffer;
        let filePath = `./public/public/${path}`
        await writeFileAsync(filePath, data)
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
        res.status(200).send('ok');
    } catch (e) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
})
routerImage.get('/local-data', async (req, res) => {
    let arrImgUrls, textContent, isAudioExist, isExistVideo;
    const {id} = req.query;
    try {
        const news = global.dbNews.getByID(id);
        let filePath = `./public/public/${news.pathSrc}/`

        const _arrImgUrls = await findExtFiles(filePath, 'png');
        arrImgUrls = _arrImgUrls.map(path => path.split('\\').splice(2).join('\\'))

    } catch (error) {
        console.error(error.message)
    } finally {
        res.status(200).send(arrImgUrls);
    }
});

routerImage.post('/create-main-image', async (req, res) => {
    try {
        const {body: {filePathOut}} = req;
        const {arrTask, title, date, srcImg} = global.dbTask.getByID('config')

        const mainTitle = dbTask.getByID('config')?.mainTitle ?? ''
        await renderToBrowser({
            urlTemplate: 'http://localhost:3000/content/templates/mainImg',
            pathOut: filePathOut,
            data: {
                mainTitle,
                img: srcImg
            }
            // debug: true
        })
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

export default routerImage;