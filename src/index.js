import {connectDB, downloadImages, getArrUrlsImageDDG2, getListNews, getListTask, NewsUpdater} from "./parser.js";
import express from "express";
import {fileURLToPath} from 'url';
import path, {dirname} from 'path';

import {config} from "dotenv";
import bodyParser from "body-parser";
import translate from "@mgcodeur/super-translator";
import {
    checkFileExists,
    createAndCheckDir,
    findExtFiles,
    formatDateTime,
    pathResolveRoot,
    readFileAsync,
    removeFile,
    saveTextToFile,
    WEBSocket,
    writeFileAsync
} from "./utils.js";
import {buildAllNews, buildAnNews} from "./video.js";
import theGuardian from "./theGuardian.js";
import russiaToday from "./russiaToday.js";
import {arliGPT, mistralGPT, yandexGPT, yandexToSpeech} from "./ai.js";
import axios from "axios";

// import global from "./global";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {parsed: {PORT}} = config();
const port = +process.env.PORT || +PORT;

global.port = port


// createWebSocketServer(webServer);

async function createWebServer(port) {
    const db = await connectDB();

    const app = express();
    const router = express.Router();

    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.raw());
    app.use(bodyParser.text({limit: '50mb'}));
// app.use(express.raw({ type: 'application/octet-stream' }));
    app.use('/api/v1', router);

    console.log(port)
    const webServ = app.listen(port, () => {
        console.log(`API is listening on port ${port}`);
    });

    const listNewsSrc = {
        TG: new NewsUpdater({host: 'https://www.theguardian.com', db, ...theGuardian}),
        RT: new NewsUpdater({host: 'https://russian.rt.com', db, ...russiaToday}),
    }

    // Настройка статических файлов
    const dir = '../public/dist'
    app.use(express.static(path.join(__dirname, dir))); // путь к web
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, dir, 'index.html')); // Укажите путь к вашей HTML странице
    })

    router.post('/update-db', async (req, res) => {
        const {body: {table, values, condition, typeCond}} = req;
        try {
            const lop = typeCond ? typeCond : 'AND'
            const paramSet = Object.keys(values).join(' = ? ') + ' = ?'
            const arrSet = Object.values(values)
            const paramWhere = Object.keys(condition).join(' = ? ' + lop) + ' = ?'
            const arrWhere = Object.values(condition)
            const arrVal = [].concat(arrSet, arrWhere)
            let reqSQL = `UPDATE ${table?table:'news'} SET ${paramSet} WHERE ${paramWhere}`;

            const result = await db.run(reqSQL, arrVal);
            console.log(result)

            res.status(200).send('ok')
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.get('/images-remove', async (req, res) => {
        try {
            const {path} = req.query;
            await removeFile('./public/public/' + path)
            global?.messageSocket && global.messageSocket.send({type: 'update-news'})
        } catch (e) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    })
    router.get('/images', async (req, res) => {
        const {prompt, max, name, date} = req.query;
        try {
            const arrUrl = await getArrUrlsImageDDG2(prompt)
            res.status(200).send(arrUrl)
            await downloadImages({
                arrUrl, outputDir: `./public/public/news/${date}/${name}/`, pfx: '', ext: '.png', max: +max
            })
            global?.messageSocket && global.messageSocket.send({type: 'update-news'})
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/translate', async (req, res) => {
        const {body: data} = req;
        try {
            const arrEn = data.text.split('\n');
            let accTextEn = '';
            let accTextRu = '';

            for (let i = 0; i < arrEn.length; i++) {
                if (accTextEn.length + arrEn[i].length > 4000) {
                    const result = await translate({
                        from: 'auto', to: 'ru', text: accTextEn
                    });
                    accTextRu += result;
                    accTextEn = '';
                }
                accTextEn += arrEn[i] + '\n'
            }

            if (accTextEn.length) {
                accTextRu += await translate({
                    from: 'auto', to: 'ru', text: accTextEn
                });
            }


            res.send(accTextRu)
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/update-one-news-type', async (req, res) => {
        try {
            const {body: {typeNews, newsSrc, url}} = req;
            const data = await listNewsSrc[newsSrc].updateOneNewsType(typeNews, url);
            res.status(200).send(data)
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/remove-news', async (req, res) => {
        try {
            const {body: {id}} = req;
            const data = await db.run('DELETE FROM news WHERE ID = ?', [id]);
            res.send(data);
            global?.messageSocket?.send({type: 'update-list-news'})
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/update-news-type', async (req, res) => {
        try {
            const {body: {typeNews, newsSrc}} = req;
            await listNewsSrc[newsSrc].updateByType(typeNews);
            res.send('ok');
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.get('/list-task', async (req, res) => {
        const {from, to} = req.query;
        try {
            let result = await getListTask(db);
            res.status(200).send(result)
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.get('/list-news', async (req, res) => {
        const {from, to} = req.query;
        try {
            let result = await getListNews(db, from, to);
            res.send(result)
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/save-text', async (req, res) => {
        try {
            const {body: {path, data}} = req;
            let filePath = `./public/public/${path}`
            await saveTextToFile(filePath, data)
            res.status(200).send('ok');
        } catch (e) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    })
    router.post('/build-an-news', async (req, res) => {
        try {
            const {body: {title, tags, text, name, date, from, addText}} = req;
            let filePath = `./public/public/news/${date}/${name}/`
            await saveTextToFile(filePath + 'title.txt', title)

            await buildAnNews({
                dir_ffmpeg: './content/ffmpeg/',
                dir_content: filePath,
                pathBridge: pathResolveRoot('./content/audio/bridge.mp3'),
                pathVideoOut: filePath + 'news.mp4',
                pathLogoMini: pathResolveRoot('./content/img/logo-mini.png'),
                from,
                addText
            })

            res.status(200).send('Ok');
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/build-all-news', async (req, res) => {
        try {
            const {body: arrTask} = req;

            const arrPath = arrTask.map(({id, title, name, date}) => {
                const filePath = `./public/public/news/${date}/${name}/`
                return pathResolveRoot(filePath + 'news.mp4')
            })
            let filePathOut = `./public/public/done/` + formatDateTime(new Date(), 'yy-mm-dd_hh_MM_ss.mp4');
            let filePathIntro = pathResolveRoot('./content/video/intro.mp4');
            let filePathEnd = pathResolveRoot('./content/video/end.mp4');

            await createAndCheckDir(filePathOut);

            await buildAllNews({
                dir_ffmpeg: './content/ffmpeg/',
                dir_content: `./public/public/done/`,
                arrPathVideo: arrPath,
                pathIntro: filePathIntro,
                pathEnd: filePathEnd,
                pathBackground: pathResolveRoot('./content/audio/back-05.mp3'),
                pathOut: filePathOut
            })
            res.status(200).send('Ok');
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.get('/local-data', async (req, res) => {
        let arrImgUrls, textContent, isExistAudio, isExistVideo;
        try {
            const {name, date} = req.query;
            let filePath = `./public/public/news/${date}/${name}/`

            const promArrImgUrls = findExtFiles(filePath, 'png');
            const promTextContent = readFileAsync(filePath + 'news.txt');
            const promIsExistAudio = checkFileExists(filePath + 'speech.mp3');
            const promIsExistVideo = checkFileExists(filePath + 'news.mp4');

            [arrImgUrls, textContent, isExistAudio, isExistVideo] = await Promise.allSettled([promArrImgUrls, promTextContent, promIsExistAudio, promIsExistVideo])
            arrImgUrls = arrImgUrls.value.map(path => path.split('\\').splice(2).join('\\'))

        } catch (error) {
            // res.status(error.status || 500).send({error: error?.message || error},);
            console.error(error.message)
        } finally {
            res.status(200).send({
                arrImgUrls: arrImgUrls,
                textContent: textContent?.value?.toString() ?? '',
                isExistAudio: isExistAudio.value,
                isExistVideo: isExistVideo.value
            });
        }
    });

    router.post('/gpt', async (req, res) => {
        const {body: {type, text, prompt}} = req;

        switch (type) {
            case 'yandex':
                await yandexGPT(prompt, text, res);
                break;
            case 'arli':
                await arliGPT(prompt, text, res);
                break;
            case 'mistral':
                await mistralGPT(prompt, text, res);
                break;
            default:
                await arliGPT(prompt, text, res);
        }
    });

    router.post('/to-speech', async (req, res) => {

        try {
            const {body: {text, name, date, voice, speed}} = req;

            await yandexToSpeech({text, date, name, voice: voice ?? 'marina', speed: speed ?? 1.4});

            res.send('ok');
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }


    });

    //@ts-ignore
    global.messageSocket = new WEBSocket(webServ, {
        clbAddConnection: async ({arrActiveConnection}) => {
            try {
                console.log('новый клиент')
            } catch (e) {
                console.log(e)
            }
        }
    })
}

await createWebServer(global.port);