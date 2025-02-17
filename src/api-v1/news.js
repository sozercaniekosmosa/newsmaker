//import global from "../global.js";
import {checkFileExists, copyFile, createAndCheckDir, formatDateTime, pathResolveRoot, removeDir, saveTextToFile} from "../utils.js";
import express from "express";
import {buildAllNews, buildAnNews} from "../video.js";
import {getListNews, getListTask, renderToBrowser} from "../parser.js";
import axios from "axios";
import routerImage from "./images.js";
// import {clearImage} from "../tst/cleaner.js";
import {resizeImage} from "../services/imagePrcessing.js";
import fs from "fs";
import sharp from "sharp";
import {clearImage} from "../services/cleaner.js";
// import fs from "fs";
// import {clearImage} from "../tst/cleaner.js";

const routerNews = express.Router();

routerNews.post('/update-db-news', async (req, res) => {
    const {body: news} = req;
    try {
        global.dbNews.update(news)

        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerNews.post('/remove-news', async (req, res) => {
    try {
        const {body: {id}} = req;
        // const data = await global.dbNews.run('DELETE FROM news WHERE ID = ?', [id]);
        const data = await global.dbNews.del(id);
        res.send(data);
        global?.messageSocket?.send({type: 'update-list-news'})
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerNews.post('/update-one-news-type', async (req, res) => {
    try {
        const {body: {typeNews, newsSrc, url}} = req;
        const data = await listNewsSrc[newsSrc].updateOneNewsType(typeNews, url);
        res.status(200).send(data)
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerNews.post('/update-news-type', async (req, res) => {
    try {
        const {body: {typeNews, newsSrc}} = req;
        await global.listNewsSrc[newsSrc].updateByType(typeNews);
        res.send('ok');
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});

routerNews.post('/build-shorts', async (req, res) => {
    try {
        const {body: {id}} = req;

        const news = global.dbNews.getByID(id);

        const dur = news.audioDur / (news.secPerFrame ?? 1.5)

        const fileShortsName = 'shorts-1080x1920.png';
        if (!await checkFileExists(global.root + `/public/public/${news.pathSrc}/img/` + fileShortsName)) {
            global.messageSocket.send({type: 'popup-message', data: 'Добавьте shorts - файл'});
            res.status(error.status || 500).send({error: error?.message || error},);
            return
        }
        let arrImgPrep = [fileShortsName, fileShortsName, ...news.arrImg];

        const _arrImg = Array(Math.ceil(dur / arrImgPrep.length)).fill(arrImgPrep).flat().splice(0, dur);

        let outputDir = global.root + `/public/public/${news.pathSrc}/tmp/`;
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive: true});

        const promisedArrImg = _arrImg.map(async imgName => {
            const imageName = imgName.split('?')[0];
            const pathOriginal = global.getImagePath(news.pathSrc, imageName);
            const pathResized = global.root + `/public/public/${news.pathSrc}/tmp/${imageName}`;

            return await resizeImage({
                inputArrBufOrPath: pathOriginal, outputFilePath: pathResized,
                maxWidth: 1080, maxHeight: 1920,
                fit: 'cover',
                background: false,
                withoutEnlargement: false,
                position: sharp.strategy.attention
            });
        });

        const arrImg = await Promise.allSettled(promisedArrImg);

        let filePath = `./public/public/${news.pathSrc}/`
        await saveTextToFile(filePath + 'title.txt', news.title)

        const arrEff = ['fade', 'fade', 'slideleft', 'slideright', 'slideup', 'slidedown', 'pixelize', 'hblur', 'zoomin', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'circleclose', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'fadegrays', 'slideleft', 'slideright', 'slideup', 'slidedown', 'pixelize', 'hblur', 'zoomin', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'circleclose', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'fadegrays', 'slideleft', 'slideright', 'slideup', 'slidedown', 'pixelize', 'hblur', 'zoomin', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'circleclose', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'fadegrays']

        const duration = await buildAnNews({
            dir_ffmpeg: './content/ffmpeg/',
            dir_content: filePath,
            arrImg: arrImg.map(it => it.value),
            pathBridge: pathResolveRoot('./content/audio/bridge.mp3'),
            pathVideoOut: filePath + 'news.mp4',
            pathLogoMini: pathResolveRoot('./content/img/logo-mini.png'),
            from: news.from,
            textAdd: news.textAdd,
            arrEff,
            width: 1080,
            height: 1920,
            pathVideo: 'shorts.mp4'
        })

        await removeDir(outputDir);

        let arrImgExist = ([news.arrImg, news.arrImgTg]).flat();
        await clearImage(arrImgExist, news.pathSrc)

        dbNews.update({...news, videoDur: duration})
        global?.messageSocket && global.messageSocket.send({type: 'update-news'});
        res.status(200).send({respID: id});
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});

routerNews.post('/build-an-news', async (req, res) => {
    try {
        const {body: {id}} = req;

        const news = global.dbNews.getByID(id);

        const dur = news.audioDur / (news.secPerFrame ?? 1.5)

        const fileTitleName = 'title-1920x1080.png';
        const fileShortsName = 'shorts-1080x1920.png';
        if (!await checkFileExists(global.root + `/public/public/${news.pathSrc}/img/` + fileTitleName)) {
            global.messageSocket.send({type: 'popup-message', data: 'Добавьте title - файл'});
            res.status(error.status || 500).send({error: error?.message || error},);
            return
        }

        let arrImgPrep = [fileTitleName, fileTitleName, ...news.arrImg];

        const _arrImg = Array(Math.ceil(dur / arrImgPrep.length)).fill(arrImgPrep).flat().splice(0, dur);

        let outputDir = global.root + `/public/public/${news.pathSrc}/tmp/`;
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive: true});

        const promisedArrImg = _arrImg.map(async imgName => {
            const imageName = imgName.split('?')[0];
            const pathOriginal = global.getImagePath(news.pathSrc, imageName);
            const pathResized = global.root + `/public/public/${news.pathSrc}/tmp/${imageName}`;

            return await resizeImage({
                inputArrBufOrPath: pathOriginal, outputFilePath: pathResized, width: 1920, height: 1080,
                // maxWidth: 1920, maxHeight: 1080, fit: 'contain'
            });
        });

        const arrImg = await Promise.allSettled(promisedArrImg);

        let filePath = `./public/public/${news.pathSrc}/`
        await saveTextToFile(filePath + 'title.txt', news.title)

        const arrEff = ['fade', 'fade', 'slideleft', 'slideright', 'slideup', 'slidedown', 'pixelize', 'hblur', 'zoomin', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'circleclose', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'fadegrays', 'slideleft', 'slideright', 'slideup', 'slidedown', 'pixelize', 'hblur', 'zoomin', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'circleclose', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'fadegrays', 'slideleft', 'slideright', 'slideup', 'slidedown', 'pixelize', 'hblur', 'zoomin', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown', 'circlecrop', 'circleclose', 'horzclose', 'horzopen', 'vertclose', 'vertopen', 'diagbl', 'diagbr', 'diagtl', 'diagtr', 'fadegrays']

        const duration = await buildAnNews({
            dir_ffmpeg: './content/ffmpeg/',
            dir_content: filePath,
            arrImg: arrImg.map(it => it.value),
            pathBridge: pathResolveRoot('./content/audio/bridge.mp3'),
            pathVideoOut: filePath + 'news.mp4',
            pathLogoMini: pathResolveRoot('./content/img/logo-mini.png'),
            from: news.from,
            textAdd: news.textAdd,
            arrEff,
            width: 1920,
            height: 1080,
            clbMessage: (mess) => {
                global.messageSocket.send({type: 'popup-message', data: mess})
            }
        })

        await removeDir(outputDir);

        let arrImgExist = ([news.arrImg, news.arrImgTg, fileTitleName, fileShortsName]).flat();
        await clearImage(arrImgExist, news.pathSrc)

        dbNews.update({...news, videoDur: duration})
        global?.messageSocket && global.messageSocket.send({type: 'update-news'});
        res.status(200).send({respID: id});
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerNews.post('/build-all-news', async (req, res) => {
    try {
        // const {body} = req;
        // setTimeout(async () => await res.status(200).send('Ok'), 3000);
        //
        // return;

        const {arrTask, title, date, srcImg} = global.dbTask.getByID('config')

        let filePathOut = `./public/public/done/` + formatDateTime(new Date(date), 'yy-mm-dd_hh_MM_ss' + '/');
        let filePathIntro = pathResolveRoot('./content/video/intro.mp4');
        let filePathEnd = pathResolveRoot('./content/video/end.mp4');

        const arrPath = arrTask.map(({id}) => {
            const {pathSrc} = dbNews.getByID(id);
            const filePath = `./public/public/${pathSrc}/`
            return pathResolveRoot(filePath + 'news.mp4')
        })

        await createAndCheckDir(filePathOut + '.mp4');

        await buildAllNews({
            dir_ffmpeg: './content/ffmpeg/',
            dir_content: `./public/public/done/`,
            arrPathVideo: arrPath,
            pathIntro: filePathIntro,
            pathEnd: filePathEnd,
            pathBackground: pathResolveRoot('./content/audio/back-05.mp3'),
            pathOut: filePathOut + 'news-all.mp4'
        })

        await saveTextToFile(filePathOut + 'title.txt', title)

        global?.messageSocket && global.messageSocket.send({type: 'update-news'})

        // const baseImagePath = pathResolveRoot(`./public/public/` + (new URL(srcImg)).pathname);
        // const overlayImagePath = pathResolveRoot('./content/img/logo-lg.png');
        // const outputPath = filePathOut + 'title.png';
        // const x = 0; // Координата X для наложения
        // const y = 1080 - 240; // Координата Y для наложения
        //
        // await overlayImages(baseImagePath, overlayImagePath, outputPath, x, y);

        res.status(200).send('Ok');
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerNews.get('/list-news', async (req, res) => {
    const {from, to} = req.query;
    try {
        let result = await getListNews(from, to);
        res.send(result)
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});

routerNews.post('/update-db-task', async (req, res) => {
    const {body: taskProp} = req;
    try {
        global.dbTask.update({id: 'config', ...taskProp})

        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});
routerNews.get('/list-task', async (req, res) => {
    try {
        let result = await getListTask(dbTask);
        res.status(200).send(result)
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});

routerNews.get('/exist-resource', async (req, res) => {
    try {
        const {url} = req.query;
        const response = await axios.head(url);
        if (response.status === 200) res.status(200).send('Ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    }
});

routerNews.post('/create-news', async (req, res) => {
    try {
        // const {body: {id, url}} = req;
        // const news = global.dbNews.getByID(id);
        // let pathOut = `./public/public/${news.pathSrc}/title.png`
        await renderToBrowser({
            urlTemplate: 'http://localhost:3000/content/templates/buildNews', pathOut: 'tst.mp4', data: {
                // text: news.title,
                // img: '\\public\\public\\' + url.split('?')[0]
            }, debug: true
        })
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

routerNews.post('/tg-public-news', async (req, res) => {
    try {
        const {body: {id, date, inATime, arrImg, text}} = req;

        const news = global.dbNews.getByID(id);

        // await clearImage(news.arrImgTg, `public/public/${news.pathSrc}/img/`)

        const _arrImg = arrImg.map(imgName => {
            return `./public/public/${news.pathSrc}/img/` + imgName.split('?')[0];
        });
        const __arrImg = _arrImg.map(src => pathResolveRoot(src.replaceAll(/\\/g, '/')))

        const {scheduledMessages, publishedMessages} = global.dbTB.getByID('tb')
        const arrMessage = Object.entries(scheduledMessages)?.map(([messageID, message]) => message)
        let dateTime;
        if (arrMessage && arrMessage.length) {
            const [item] = arrMessage.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
            dateTime = (new Date(item.publishTime)).getTime() + (+inATime);
        } else {
            const arrMessage = Object.entries(publishedMessages)?.map(([messageID, message]) => message)
            if (arrMessage && arrMessage.length) {
                const [item] = arrMessage.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
                dateTime = (new Date(item.publishTime)).getTime() + (+inATime);
            } else {
                dateTime = new Date(Date.now())
            }
        }

        if (new Date(Date.now()) > dateTime) dateTime = new Date(Date.now());


        global.tgBot.publishMessage(global.tgChannelID_1, text, __arrImg, new Date(dateTime), id)
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

export default routerNews;