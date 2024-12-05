import {downloadImages, getArrUrlsImageDDG, getArrUrlsImageDDG2, getNewsList, updateTG} from "./parser.js";
import express from "express";
import {fileURLToPath} from 'url';
import {dirname} from 'path';

import {config} from "dotenv";
import bodyParser from "body-parser";
import path from "path";
import translate from "@mgcodeur/super-translator";
import axios from "axios";
import {findExtFiles, pathResolveRoot, readFileAsync, saveTextToFile, writeData, writeFileAsync} from "./utils.js";
import {buildAnNews, test} from "./video.js";

// import global from "./global";

let iamToken, dtExpMs;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {parsed: {PORT, OAUTH_TOKEN, FOLDER_ID}} = config();
const port = +process.env.PORT || +PORT;

global.port = port


// createWebSocketServer(webServer);

function createWebServer(port) {
    const app = express();
    const router = express.Router();

    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.raw());
    app.use(bodyParser.text({limit: '50mb'}));
// app.use(express.raw({ type: 'application/octet-stream' }));
    app.use('/api/v1', router);

    const webServ = app.listen(port, () => {
        console.log(`API is listening on port ${port}`);
    });

    // Настройка статических файлов
    const dir = '../public/dist'
    app.use(express.static(path.join(__dirname, dir))); // путь к web
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, dir, 'index.html')); // Укажите путь к вашей HTML странице
    })

    router.get('/images', async (req, res) => {
        const {prompt, max, name, date} = req.query;
        try {
            const arrUrl = await getArrUrlsImageDDG2(prompt)
            res.send(arrUrl)
            const arrNames = await downloadImages({arrUrl, outputDir: `./public/public/news/${date}/${name}/`, pfx: '', ext: '.png', max: +max})
            // res.send(arrNames)
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
    router.post('/update', async (req, res) => {
        try {
            const numbNewsadded = await updateTG()
            res.send({numb: numbNewsadded});
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.get('/news', async (req, res) => {
        const {from, to} = req.query;
        try {
            let result = await getNewsList(from, to);
            res.send(result)
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });
    router.post('/build', async (req, res) => {
        try {
            const {body: {title, tags, text, name, date}} = req;
            let filePath = `./public/public/news/24.11.29/tg-2V8DsGq2u/`
            // let filePath = `./public/public/news/${date}/${name}/`
            // await saveTextToFile(filePath + 'title.txt', title)
            // await saveTextToFile(filePath + 'tags.txt', tags)
            // await saveTextToFile(filePath + 'news.txt', text)

            await buildAnNews({
                dir_ffmpeg: './content/ffmpeg/',
                dir_content: filePath,
                pathBridge: pathResolveRoot('./content/audio/bridge.mp3'),
                pathVideoOut: filePath + 'news.mp4',
                pathLogoMini: pathResolveRoot('./content/img/logo-mini.png'),
            })

            // await updateTG()
            res.status(200).send('Ok');
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.get('/loc-images', async (req, res) => {
        try {
            const {title, tags, text, name, date} = req.query;
            let filePath = `./public/public/news/${date}/${name}/`

            // http://localhost:5173/news/24.11.30/tg-av9jWaxxA/1.png
            // await updateTG()
            let arrImgUrls = await findExtFiles(filePath, 'png');
            arrImgUrls = arrImgUrls.map(path=>path.split('\\').splice(2).join('\\'))
            res.status(200).send(arrImgUrls);
        } catch (error) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    });

    router.post('/gpt', async (req, res) => {
        const {body: {text, prompt}} = req;

        const iam_token = await getIAM();
        const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

        const promptData = {
            // modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite`,
            modelUri: `gpt://${FOLDER_ID}/yandexgpt/rc`,//
            completionOptions: {stream: false, "temperature": 0, "maxTokens": "15000"},
            messages: [{role: "system", "text": prompt ?? "Упрости текст до 30 слов"}, {role: "user", text}]
        }
        try {
            const {data} = await axios.post(url, promptData, {
                headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${iam_token}`}, params: {folderId: FOLDER_ID,},
            })

            console.log(data.result)
            res.send(data.result);
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }

    });
    router.post('/tospeech', async (req, res) => {
        const {body: {text, name, date}} = req;

        try {
            const iam_token = await getIAM();
            const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

            //     const text = `
            //     Я Яндекс Спичк+ит.
            //     Я могу превратить любой текст в речь.
            //     Теперь и в+ы — можете!
            // `;


            const {data} = await axios({
                method: 'POST', url, headers: {
                    'Authorization': `Bearer ${iam_token}`
                }, responseType: 'arraybuffer',  // Получаем данные как бинарный массив
                data: new URLSearchParams({
                    text, lang: 'ru-RU', voice: 'jane', // voice: 'ermil',
                    // voice: 'filipp',
                    // voice: 'lera',
                    speed: '1.4', folderId: FOLDER_ID, format: 'mp3', sampleRateHertz: '48000'
                })
            })

            await writeFileAsync(`./public/public/news/${date}/${name}/speech.mp3`, data);
            console.log('Аудиофайл успешно создан.');


            // const {data} = await axios.post(url, promptData, {
            //     headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${iam_token}`},
            //     params: {folderId: FOLDER_ID,},
            // })

            res.send('ok');
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }

    });
}

const getIAM = async () => { //для работы нужен AIM для его получения нужен OAUTH его можно взять тут: https://oauth.yandex.ru/verification_code
    let expiresAt, dtNowMs = (new Date()).getTime();
    const filePath = path.join('./', 'iam.json');

    if (dtExpMs && dtExpMs > dtNowMs) return iamToken; //dtExpMs-заиничен и время не истекло, то выход

    if (!dtExpMs) {//dtExpMs - не заиничен
        try {
            const raw = await readFileAsync(filePath);
            ({iamToken, expiresAt} = JSON.parse(raw.toString()));
            dtExpMs = (new Date(expiresAt)).getTime();
        } catch (error) {
            console.log(error)
        }
    }

    if (dtExpMs && dtExpMs > dtNowMs) return iamToken; //если файл есть и время не истекло, то выход

    try {
        // curl \
        //   --request POST \
        //   --data '{"yandexPassportOauthToken":"<OAuth-токен>"}' \
        //   https://iam.api.cloud.yandex.net/iam/v1/tokens

        // OAUTH_TOKEN дается на 1 год срок выйдет 03 ноя 2025
        const resp = await axios.post('https://iam.api.cloud.yandex.net/iam/v1/tokens', {yandexPassportOauthToken: OAUTH_TOKEN})
        console.log(resp)
        const {data} = resp;
        ({iamToken, expiresAt} = data);
        await writeFileAsync(filePath, JSON.stringify(data))

    } catch (error) {
        console.log(error)
    }

    return iamToken;
}

//добавлять в конце: ты умеешь упрощать текст до 100 слов

// console.log(await getIAM())

createWebServer(global.port);