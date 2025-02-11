import {copyFile, findExtFiles, removeFile, writeFileAsync} from "../utils.js";
import express from "express";
import {downloadImages, ImageDownloadProcessor, renderToBrowser} from "../parser.js";
import multer from "multer";
import {resizeImage} from "../services/imagePrcessing.js";
import sharp from "sharp";
import {removeImageDir} from "../services/cleaner.js";
import {getAllImagesByTags, updateTags} from "../services/tagToImages.js";
import fs from "fs";

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
    const {prompt, max, id, timeout, isResize} = req.query;
    try {
        const news = global.dbNews.getByID(id);
        const ip = new ImageDownloadProcessor()
        const arrUrl = (await ip.getArrImage(prompt)).slice(0, max)
        res.status(200).send({arrUrl, id})
        await downloadImages({
            arrUrl,
            outputDir: global.root + `/public/public/${news.pathSrc}/img/`, pfx: '', ext: '.png',
            count: +max, timeout,
            // width: 1920, height: 1080
        })
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});

routerImage.get('/images-tg', async (req, res) => {
    const {prompt, max, id, timeout, isResize} = req.query;
    try {
        const news = global.dbNews.getByID(id);
        const ip = new ImageDownloadProcessor()
        const arrUrl = (await ip.getArrImage(prompt)).slice(0, max)
        res.status(200).send({arrUrl, id})
        await downloadImages({
            arrUrl,
            outputDir: `./public/public/${news.pathSrc}/img/`, pfx: '', ext: '.png',
            count: +max, timeout
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
        let filePath = `./public/public/${path.split('?')[0]}`
        await writeFileAsync(filePath, data)
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
        res.status(200).send('ok');
    } catch (e) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
})
routerImage.get('/local-image-src', async (req, res) => {
    let arrImgUrls;
    const {id} = req.query;
    try {
        const news = global.dbNews.getByID(id);
        let filePath = `./public/public/${news.pathSrc}/img/`;
        const _arrImgUrls = await findExtFiles(filePath, 'png', false);
        arrImgUrls = _arrImgUrls.map(path => path.split('\\').splice(2).join('\\'))

    } catch (error) {
        console.error(error.message)
    } finally {
        res.status(200).send(arrImgUrls);
    }
});

routerImage.get('/local-image-src-tg', async (req, res) => {
    let arrImgUrls, textContent, isAudioExist, isExistVideo;
    const {id} = req.query;
    try {
        const news = global.dbNews.getByID(id);
        let filePath = `./public/public/${news.pathSrc}/img/`

        const _arrImgUrls = await findExtFiles(filePath, 'png', false);
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
                img: srcImg.split('?')[0]
            },
            // debug: true
        })
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

routerImage.post('/create-title-image', async (req, res) => {
    try {
        const {body: {id, url}} = req;
        const news = global.dbNews.getByID(id);
        const pathImg = url.split('?')[0];

        const nameImage = pathImg.split('\\').reverse()[0];
        const nameImageOut = 'title-' + nameImage.split('-')[1];
        const pathIn = global.getImagePath(news.pathSrc, nameImage)
        const pathOut = global.getImagePath(news.pathSrc, nameImageOut)

        const _pathOut = await resizeImage({
            inputArrBufOrPath: pathIn,
            outputFilePath: pathOut,
            maxWidth: 1920, maxHeight: 1080,
            fit: 'cover',
            background: false,
            withoutEnlargement: false,
            position: sharp.strategy.entropy
        })

        const _arr = _pathOut.split('/')
        _arr.shift()
        const __pathOut = '/' + _arr.join('/')

        await renderToBrowser({
            urlTemplate: 'http://localhost:3000/content/templates/newsTitleImg', pathOut: _pathOut,//: global.getImagePath(news.pathSrc, nameImage),
            data: {
                text: news.title, img: __pathOut
            },
            // debug: true
        })
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

routerImage.post('/create-shorts-image', async (req, res) => {
    try {
        const {body: {id, url}} = req;
        const news = global.dbNews.getByID(id);
        const pathImg = url.split('?')[0];

        const nameImage = pathImg.split('\\').reverse()[0];
        const nameImageOut = 'shorts-' + nameImage.split('-')[1];
        const pathIn = global.getImagePath(news.pathSrc, nameImage)
        const pathOut = global.getImagePath(news.pathSrc, nameImageOut)

        const _pathOut = await resizeImage({
            inputArrBufOrPath: pathIn, outputFilePath: pathOut,
            maxWidth: 1080, maxHeight: 1920,
            fit: 'cover',
            background: false,
            withoutEnlargement: false,
            position: sharp.strategy.attention
        })

        const _arr = _pathOut.split('/')
        _arr.shift()
        const __pathOut = '/' + _arr.join('/')

        await renderToBrowser({
            urlTemplate: 'http://localhost:3000/content/templates/shortsImg', pathOut: _pathOut,
            data: {
                text: news.title, img: __pathOut
            },
            width: 1080,
            height: 1920,
            // debug: true
        })
        res.status(200).send('ok')
    } catch
        (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

routerImage.post('/upscale-image', async (req, res) => {
    try {
        const {body: {id, url, way}} = req;
        const news = global.dbNews.getByID(id);
        const pathImg = url.split('?')[0];

        const nameImage = pathImg.split('\\').reverse()[0];
        const nameImageOut = 'main-' + nameImage.split('-')[1];
        const pathIn = global.getImagePath(news.pathSrc, nameImage)
        const pathOut = global.getImagePath(news.pathSrc, nameImageOut)

        await resizeImage({
            inputArrBufOrPath: pathIn, outputFilePath: pathOut,
            width: way === 0 ? 1920 : undefined, height: way === 0 ? 1080 : undefined,
            maxWidth: 1920, maxHeight: 1080,
            fit: 'cover',
            background: false,
            withoutEnlargement: false,
            position: way === 1 ? sharp.strategy.attention : way === 2 ? sharp.strategy.entropy : undefined
        })

        res.status(200).send('ok')
    } catch
        (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

routerImage.post('/remove-all-image', async (req, res) => {
    try {
        const {body: {id}} = req;
        const news = global.dbNews.getByID(id);

        const pathImg = global.getImagePath(news.pathSrc)

        await removeImageDir(pathImg);
        OK(`Содержимое директории удалено ${pathImg}`)
        res.status(200).send('ok')
    } catch
        (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
        ERR(error?.message || error)
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})
routerImage.post('/update-tags', async (req, res) => {
    try {
        await updateTags();
        OK(`Теги обновлено`)
        res.status(200).send('ok')
    } catch
        (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
        ERR(error?.message || error)
    }
})

routerImage.get('/tags-image', async (req, res) => {
    try {
        const {tags, id} = req.query;
        const news = global.dbNews.getByID(id);
        const arr = global.dbGeneral.getByID('tags').arr;
        const arrImgPath = await getAllImagesByTags(tags.toLocaleLowerCase(), arr);

        const outputDir = global.getImagePath(news.pathSrc);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive: true});

        for (let j = 0; j < arrImgPath.length; j++) {
            const pathFrom = arrImgPath[j];
            const fn = pathFrom.split('\\').reverse()[0];
            const pathTo = global.getImagePath(news.pathSrc, fn);
            await copyFile(pathFrom, pathTo);

        }

        OK(`Теги изображений получены`)
        res.status(200).send(arrImgPath)
    } catch
        (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
        ERR(error?.message || error)
    }
})

export default routerImage;