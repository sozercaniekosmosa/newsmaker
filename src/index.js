//import global from "./global.js";
import express from "express";
import {fileURLToPath} from 'url';
import path, {dirname} from 'path';
import {config} from "dotenv";
import bodyParser from "body-parser";
import {WEBSocket} from "./utils.js";
import {noSQL} from "./DB/noSQL.js";
import routerGeneral from "./api-v1/general.js";
import routerImage from "./api-v1/images.js";
import routerNews from "./api-v1/news.js";
import routerGPT from "./api-v1/gpt.js";
import {NewsUpdater} from "./parser.js";
import dzen from "./parsers/dzen.js";
import {TelegramChannelBot} from "./telegram.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = config({override: true, path: './.env'});
const {PORT, WEB_DIR, BOT_TOKEN, TG_CHANNEL_ID, TG_CHANNEL_NAME, TG_GROUP_STORAGE_ID, TG_GROUP_STORAGE_THREAD_ID} = env.parsed

const port = +process.env.PORT || +PORT;

global.root = path.resolve(__dirname, '..');
global.port = port
global.dbNews = new noSQL('./dbNews.json');
global.dbTask = new noSQL('./dbTask.json');
global.dbTask = new noSQL('./dbTask.json');
global.dbTB = new noSQL('./dbTB.json');
global.tgChannelID_1 = TG_CHANNEL_ID;
global.tgBot = new TelegramChannelBot(BOT_TOKEN, TG_GROUP_STORAGE_ID, TG_GROUP_STORAGE_THREAD_ID, global.dbTB);
global.listNewsSrc = {
    // TG: new NewsUpdater({host: 'https://www.theguardian.com', dbNews, ...theGuardian}),
    // RT: new NewsUpdater({host: 'https://russian.rt.com', dbNews, ...russiaToday}),
    DZ: new NewsUpdater({host: 'https://dzen.ru/news', short: 'DZ', db: global.dbNews, ...dzen}),
}


async function createWebServer(port) {
    const app = express();

    app.use(express.static(path.join(__dirname, WEB_DIR))); // путь к web-страницам

    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.raw());
    app.use(bodyParser.text({limit: '50mb'}));
// app.use(express.raw({ type: 'application/octet-stream' }));
    app.use('/api/v1', routerGeneral);
    app.use('/api/v1', routerImage);
    app.use('/api/v1', routerNews);
    app.use('/api/v1', routerGPT);

    console.log(port)
    const webServ = app.listen(port, () => {
        console.log(`API is listening on port ${port}`);
    });

    app.get('/', (req, res) => {// путь к корневой директории
        res.sendFile(path.join(__dirname, WEB_DIR, 'index.html'));
    })

    app.use((req, res, next) => {
        res.status(404).send('Запрошеный ресурс не найден!');
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
