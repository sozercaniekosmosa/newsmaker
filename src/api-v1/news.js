//import global from "../global.js";
import {createAndCheckDir, formatDateTime, pathResolveRoot, saveTextToFile} from "../utils.js";
import express from "express";
import {buildAllNews, buildAnNews} from "../video.js";
import {getListNews, getListTask, renderToBrowser} from "../parser.js";
import axios from "axios";
import routerImage from "./images.js";

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
routerNews.post('/build-an-news', async (req, res) => {
    try {
        const {body: {id}} = req;

        const news = global.dbNews.getByID(id);
        const dur = news.audioDur / (news.secPerFrame ?? 1.5)
        const _arrImg = Array(Math.ceil(dur / news.arrImg.length)).fill(news.arrImg).flat().splice(0, dur);
        const arrImg = _arrImg.map(imgName => {
            return `./public/public/${news.pathSrc}/` + imgName.split('?')[0];
        });

        let filePath = `./public/public/${news.pathSrc}/`
        await saveTextToFile(filePath + 'title.txt', news.title)

        const duration = await buildAnNews({
            dir_ffmpeg: './content/ffmpeg/',
            dir_content: filePath,
            arrImg: arrImg.map(src => pathResolveRoot(src.replaceAll(/\\/g, '/'))),
            pathBridge: pathResolveRoot('./content/audio/bridge.mp3'),
            pathVideoOut: filePath + 'news.mp4',
            pathLogoMini: pathResolveRoot('./content/img/logo-mini.png'),
            from: news.from,
            textAdd: news.textAdd
        })

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
            urlTemplate: 'http://localhost:3000/content/templates/buildNews',
            pathOut:'tst.mp4',
            data: {
                // text: news.title,
                // img: '\\public\\public\\' + url.split('?')[0]
            },
            debug: true
        })
        res.status(200).send('ok')
    } catch (error) {
        res.status(error.status || 500).send({error: error?.message || error},);
    } finally {
        global?.messageSocket && global.messageSocket.send({type: 'update-news'})
    }
})

export default routerNews;