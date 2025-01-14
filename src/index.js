import {downloadImages, getListNews, getListTask, getPathSourceNews, ImageDownloadProcessor, NewsUpdater, overlayImages} from "./parser.js";
import express from "express";
import {fileURLToPath} from 'url';
import path, {dirname} from 'path';
import {config} from "dotenv";
import bodyParser from "body-parser";
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
import {arliGPT, mistralGPT, yandexGPT, yandexToSpeech} from "./ai.js";
import multer from "multer";
import dzen from "./parsers/dzen.js";
import {noSQL} from "./noSQL.js";
import {execFile} from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {parsed: {PORT}} = config();
const port = +process.env.PORT || +PORT;

global.port = port


async function createWebServer(port) {
    const dbNews = new noSQL('./dbNews.json');
    const dbTask = new noSQL('./dbTask.json');

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
        // TG: new NewsUpdater({host: 'https://www.theguardian.com', dbNews, ...theGuardian}),
        // RT: new NewsUpdater({host: 'https://russian.rt.com', dbNews, ...russiaToday}),
        DZ: new NewsUpdater({host: 'https://dzen.ru/news', short: 'DZ', db: dbNews, ...dzen}),
    }

    // Настройка статических файлов
    const dir = '../public/dist'
    app.use(express.static(path.join(__dirname, dir))); // путь к web
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, dir, 'index.html')); // Укажите путь к вашей HTML странице
    })

    router.post('/update-db-news', async (req, res) => {
        const {body: news} = req;
        try {
            dbNews.update(news)

            res.status(200).send('ok')
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.post('/update-db-task', async (req, res) => {
        const {body: taskProp} = req;
        try {
            dbTask.update({id: 'config', ...taskProp})

            res.status(200).send('ok')
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.get('/images-remove', async (req, res) => {
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
    router.get('/images', async (req, res) => {
        const {prompt, max, id, timeout} = req.query;
        try {
            const news = dbNews.getByID(id);
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

    router.post('/remove-news', async (req, res) => {
        try {
            const {body: {id}} = req;
            // const data = await dbNews.run('DELETE FROM news WHERE ID = ?', [id]);
            const data = await dbNews.del('news', id);
            res.send(data);
            global?.messageSocket?.send({type: 'update-list-news'})
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
        try {
            let result = await getListTask(dbTask);
            res.status(200).send(result)
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.get('/list-news', async (req, res) => {
        const {from, to} = req.query;
        try {
            let result = await getListNews(dbNews, from, to);
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

    const upload = multer();
    router.post('/save-image', upload.single('image'), async (req, res) => {
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

    router.post('/build-an-news', async (req, res) => {
        try {
            const {body: {id}} = req;

            const news = dbNews.getByID(id);
            const dur = news.audioDur / (news.secPerFrame ?? 1.5)
            const _arrImg = Array(Math.ceil(dur / news.arrImg.length)).fill(news.arrImg).flat().splice(0, dur);
            const arrImg = _arrImg.map(imgName => {
                return `./public/public/${news.pathSrc}/` + imgName;
            });

            let filePath = `./public/public/${news.pathSrc}/`
            await saveTextToFile(filePath + 'title.txt', news.title)

            await buildAnNews({
                dir_ffmpeg: './content/ffmpeg/',
                dir_content: filePath,
                arrImg: arrImg.map(src => pathResolveRoot(src.replaceAll(/\\/g, '/'))),
                pathBridge: pathResolveRoot('./content/audio/bridge.mp3'),
                pathVideoOut: filePath + 'news.mp4',
                pathLogoMini: pathResolveRoot('./content/img/logo-mini.png'),
                from: news.from,
                textAdd: news.textAdd
            })

            res.status(200).send({respID: id});
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/build-all-news', async (req, res) => {
        try {
            // const {body} = req;

            const {arrTask, title, date, srcImg} = dbTask.getByID('config')

            const arrPath = arrTask.map(({pathSrc}) => {
                const filePath = `./public/public/${pathSrc}/`
                return pathResolveRoot(filePath + 'news.mp4')
            })
            let filePathOut = `./public/public/done/` + formatDateTime(new Date(date), 'yy-mm-dd_hh_MM_ss' + '/');
            let filePathIntro = pathResolveRoot('./content/video/intro.mp4');
            let filePathEnd = pathResolveRoot('./content/video/end.mp4');

            await createAndCheckDir(filePathOut + '.mp4');

            // await buildAllNews({
            //     dir_ffmpeg: './content/ffmpeg/',
            //     dir_content: `./public/public/done/`,
            //     arrPathVideo: arrPath,
            //     pathIntro: filePathIntro,
            //     pathEnd: filePathEnd,
            //     pathBackground: pathResolveRoot('./content/audio/back-05.mp3'),
            //     pathOut: filePathOut + 'news-all.mp4'
            // })

            global?.messageSocket && global.messageSocket.send({type: 'update-news'})

            const baseImagePath = pathResolveRoot(`./public/public/` + (new URL(srcImg)).pathname);
            const overlayImagePath = pathResolveRoot('./content/img/logo-lg.png');
            const outputPath = filePathOut + 'title.png';
            const x = 0; // Координата X для наложения
            const y = 1080 - 240; // Координата Y для наложения

            await overlayImages(baseImagePath, overlayImagePath, outputPath, x, y);

            res.status(200).send('Ok');
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.get('/local-data', async (req, res) => {
        let arrImgUrls, textContent, isAudioExist, isExistVideo;
        const {id} = req.query;
        try {
            const news = dbNews.getByID(id);
            let filePath = `./public/public/${news.pathSrc}/`

            const _arrImgUrls = await findExtFiles(filePath, 'png');
            arrImgUrls = _arrImgUrls.map(path => path.split('\\').splice(2).join('\\'))

        } catch (error) {
            console.error(error.message)
        } finally {
            res.status(200).send(arrImgUrls);
        }
    });

    router.post('/gpt', async (req, res) => {
        const {body: {id, type, text, prompt}} = req;
        let textGPT = '';
        try {
            switch (type) {
                case 'yandex':
                    textGPT = await yandexGPT(prompt, text, res);
                    break;
                case 'arli':
                    textGPT = await arliGPT(prompt, text, res);
                    break;
                case 'mistral':
                    textGPT = await mistralGPT(prompt, text, res);
                    break;
                default:
                    textGPT = await arliGPT(prompt, text, res);
            }
            // dbNews.update(id, {textGPT: textGPT});
            res.status(200).send(textGPT);
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.post('/to-speech', async (req, res) => {

        try {
            const {body: {id, text, voice, speed}} = req;

            let news = dbNews.getByID(id);
            await yandexToSpeech({text, path: news.pathSrc, voice: voice ?? 'marina', speed: speed ?? 1.4});

            res.send('ok');
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }


    });
    router.post('/open-dir', async (req, res) => {

        try {
            const {body: {id}} = req;
            let folderPath;

            if (id) {
                const news = dbNews.getByID(id);
                folderPath = pathResolveRoot(`./public/public/${news.pathSrc}/`);
            } else {
                const {arrTask, title, date, srcImg} = dbTask.getByID('config')
                folderPath = pathResolveRoot(`./public/public/done/` + formatDateTime(new Date(date), 'yy-mm-dd_hh_MM_ss' + '/'));
            }

            try {
                execFile('explorer.exe', [folderPath], {stdio: 'ignore'});
                console.log('Папка открыта в проводнике');
            } catch (error) {
                console.error(`Ошибка при открытии папки: ${error}`);
            }


            res.send('ok');
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }


    });

    global.messageSocket = new WEBSocket(webServ, {
        clbAddConnection: async ({ws, arrActiveConnection}) => {
            try {
                console.log('новый клиент')
            } catch (e) {
                console.log(e)
            }
        }
    })
}

await createWebServer(global.port);