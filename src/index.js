import {connectDB, downloadImages, getArrUrlsImageDDG2, getNewsList, NewsUpdater} from "./parser.js";
import express from "express";
import {fileURLToPath} from 'url';
import path, {dirname} from 'path';

import {config} from "dotenv";
import bodyParser from "body-parser";
import translate from "@mgcodeur/super-translator";
import axios from "axios";
import {findExtFiles, pathResolveRoot, readFileAsync, saveTextToFile, WEBSocket, writeFileAsync} from "./utils.js";
import {buildAnNews} from "./video.js";
import {getArrTags, getArrUrlOfType, getTextContent, getTitle, getUnfDate, isExistID,} from "./theGuardian.js";
import {Mistral} from "@mistralai/mistralai";

// import global from "./global";

let iamToken, dtExpMs;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {parsed: {PORT, OAUTH_TOKEN, FOLDER_ID, ARLIAI_API_KEY, MISTRAL_API_KEY}} = config();
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

    const webServ = app.listen(port, () => {
        console.log(`API is listening on port ${port}`);
    });

    const newsUpdater = new NewsUpdater({
        host: 'https://www.theguardian.com',
        connectDB, getArrTags, getArrUrlOfType, getTextContent, getTitle, getUnfDate, isExistID
    });

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

    router.get('/images', async (req, res) => {
        const {prompt, max, name, date} = req.query;
        try {
            const arrUrl = await getArrUrlsImageDDG2(prompt)
            res.status(200).send(arrUrl)
            await downloadImages({
                arrUrl, outputDir: `./public/public/news/${date}/${name}/`, pfx: '', ext: '.png', max: +max
            })
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
            const {body: {typeNews}} = req;

            await newsUpdater.updateTG(typeNews);
            res.send('ok');
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
    router.post('/save', async (req, res) => {
        try {

            const {body: {path, data}} = req;
            let filePath = `./public/public/${path}`
            await saveTextToFile(filePath, data)
            res.status(200).send('ok');
        } catch (e) {
            res.status(error.status || 500).send({error: error?.message || error},);
        }
    })
    router.post('/build', async (req, res) => {
        try {
            const {body: {title, tags, text, name, date}} = req;
            // let filePath = `./public/public/news/24.11.29/tg-2V8DsGq2u/`
            let filePath = `./public/public/news/${date}/${name}/`
            await saveTextToFile(filePath + 'title.txt', title)
            await saveTextToFile(filePath + 'tags.txt', tags)
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

    router.get('/local-data', async (req, res) => {
        let arrImgUrls;
        let textContent;
        try {
            const {name, date} = req.query;
            let filePath = `./public/public/news/${date}/${name}/`

            // http://localhost:5173/news/24.11.30/tg-av9jWaxxA/1.png
            // await updateTG()
            arrImgUrls = await findExtFiles(filePath, 'png');
            arrImgUrls = arrImgUrls.map(path => path.split('\\').splice(2).join('\\'))
            textContent = (await readFileAsync(filePath + 'news.txt')).toString();
        } catch (error) {
            // res.status(error.status || 500).send({error: error?.message || error},);
            console.log(error)
        } finally {
            res.status(200).send({arrImgUrls, textContent});
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
                headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${iam_token}`},
                params: {folderId: FOLDER_ID,},
            })

            let text = data.result.alternatives.map(({message: {text}}) => text).join('\n')

            res.send(text);
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }

    });

    router.post('/lm', async (req, res) => {
        const {body: {text, prompt}} = req;
        try {
            const {data} = await axios.post("https://api.arliai.com/v1/chat/completions", {
                model: "Mistral-Nemo-12B-Instruct-2407",
                messages: [{role: "system", content: prompt}, {
                    role: "user",
                    content: text
                },],
                repetition_penalty: 1.1,
                temperature: 0.7,
                top_p: 0.9,
                top_k: 40,
                max_tokens: 1024,
                stream: false
            }, {
                headers: {
                    "Authorization": `Bearer ${ARLIAI_API_KEY}`, "Content-Type": "application/json"
                }
            })
            const text = data.choices.map(({message: {content}}) => content).join('\n');
            res.send(text);
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).send({error: error?.message || error},);
        }

    });
    router.post('/mistral', async (req, res) => {
        const {body: {text, prompt}} = req;
        try {
            const mistral = new Mistral({
                apiKey: MISTRAL_API_KEY ?? "",
            });
            // const data = await mistral.chat.complete({
            //     model: "mistral-large-latest",
            //     messages: [
            //         {role: "system", content: prompt},
            //         {role: "user", content: text},
            //     ],
            // });
            const data = await mistral.chat.complete({
                model: "mistral-small-latest",
                // messages: [
                //     {role: "user", content: "Who is the best French painter? Answer in one short sentence.",},
                // ],
                messages: [
                    {role: "user", content: prompt + '\n' + text},
                ],
            });
            const text = data.choices.map(({message: {content}}) => content).join('\n');
            res.status(200).send(text);
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

await createWebServer(global.port);