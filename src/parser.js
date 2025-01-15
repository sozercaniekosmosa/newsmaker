import fs, {promises} from "fs";
import axios from "axios";
import {JSDOM, VirtualConsole} from "jsdom";
import randUserAgent from "random-useragent";
import {CreateVideo, cyrb53, removeFragmentsFromUrl, toShortString, writeData} from "./utils.js";
import {HttpsProxyAgent} from "https-proxy-agent";
import {Database} from "./DB/SQLight.js";
import sharp from "sharp";
import {config} from "dotenv";
import {formatDateTime, translit} from "./utils.js";

const {parsed: {IMG_COOKIE, IMG_XBROWS_VALID, IMG_XCLIENT}} = config();

function getUserAgent() {
    return randUserAgent.getRandom()
}

export async function connectDB() {
    const db = new Database('./news.db')
    await db.connect();
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY,
                url TEXT,
                title TEXT,
                tags TEXT,
                text TEXT,
                dt INTEGER,
                type TEXT,
                option TEXT,
                srcName TEXT
            )
        `);
        await db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                task TEXT
            )
        `);

        const res = await db.get(`SELECT id FROM tasks WHERE id = ?`, [0]);
        if (!res) await db.run(`INSERT INTO tasks (id, task) VALUES (?, ?)`, [0, '{}']);

    } catch (e) {
        console.log(e)
    }
    return db;
}

// await db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Bob', 'bob@example.com']);

// Получение всех пользователей
/*
const users = await db.all(`SELECT * FROM users`);
console.log(users);

// Получение одного пользователя
const user = await db.get(`SELECT * FROM users WHERE name = ?`, ['Alice']);
console.log(user);

console.log(arr)

const result = await db.run(`UPDATE users SET email = ? WHERE id = ?`, [newEmail, userId]);
console.log(`Updated ${result.changes} row(s)`);
*/

export async function getListTask(db) {
    let res;
    try {
        res = await db.getByID('config')
        res = res ? res : await db.add('config', {arrTask: [], title: '', date: '', srcImg: ''});
    } catch (e) {
        console.error(e)
    }
    return res;
}

export async function getListNews(db, from, to) {
    let res;
    try {
        if (from && to) {
            res = db.getNews({fromDate: +from, toDate: +to});
        } else {
            res = db.getAll();
        }
    } catch (e) {
        console.error(e)
    }
    return res;
}

export class Requester {
    indexProxy = -1;
    arrQueue = [];
    arrCfgProxy = [];
    maxReqPerProxyUrl;
    maxReqPerHost;
    timeRelax;

    constructor(strProxy, {maxReqPerProxyUrl = 10, maxReqPerHost = 3, timeRelax = 1000} = {}) {
        this.maxReqPerProxyUrl = maxReqPerProxyUrl;
        this.maxReqPerHost = maxReqPerHost;
        this.timeRelax = timeRelax;

        this.arrCfgProxy = strProxy.split('\n').map(it => {
            const [host, port, user, pass] = it.split(':')
            const proxyUrl = `http://${user}:${pass}@${host}:${port}`
            const userAgent = getUserAgent();
            const httpsAgent = new HttpsProxyAgent(proxyUrl);

            return {
                httpsAgent, userAgent, listHosts: {}, doneReq: 0, timeRelax: 0
            }
        });
        this.arrCfgProxy.push({httpsAgent: null, userAgent: getUserAgent(), listHosts: {}, doneReq: 0, timeRelax: 0})
    }

    async getUrl(url) {
        if (this.arrCfgProxy.length === 0) return; //прокси вообще есть?

        let currUrl = url; //
        if (this.arrQueue.length !== 0) { //если в очереди есть не обработанные запросы
            this.arrQueue.push(url) // текущий запрпос сразу в помещаем в очередь
            currUrl = this.arrQueue.shift(); //достаем самый ранний запрос и делаем его текущим
        }
        for (let i = 0; i < this.arrCfgProxy.length; i++) {
            //берем следующий (не начинаем с первого для баланса)
            this.indexProxy = this.arrCfgProxy.length <= this.indexProxy || this.indexProxy < 0 ? 0 : ++this.indexProxy;
            const cfgProxy = this.arrCfgProxy[this.indexProxy];
            const {httpsAgent, userAgent, listHosts, doneReq, timeRelax} = cfgProxy;


            if (timeRelax < (new Date()).getMilliseconds()) cfgProxy.timeRelax = 0;// если прокси отдохнул
            if (timeRelax > 0) continue // если прокси отдыхает -> берем следующий
            if (doneReq > this.maxReqPerProxyUrl) { // если превысили лимит, делаем отдых для прокси и берем следующий
                cfgProxy.doneReq = 0; // сбрасываем лимиттер
                cfgProxy.timeRelax = (new Date()).getMilliseconds() + this.timeRelax
                continue
            }


            const host = (new URL(currUrl)).host; //берем host из url
            if (currUrl in listHosts) {//если мы уже работаем с этим хостом
                if (listHosts[host] > this.maxReqPerHost) continue; //и если для этого прокси лимит по хосту превышен берем другой
            } else {
                listHosts[host] = 0;
            }

            listHosts[host]++; // увеличиваем
            cfgProxy.doneReq++; // увеличиваем

            let data;

            try {
                ({data} = await axios.create({httpsAgent}).get(url, {headers: {"User-Agent": userAgent}}));
            } catch (e) {
                cfgProxy.doneReq--; // уменьшаем
                continue;
            } finally {
                listHosts[host]--; // уменьшаем
            }

            return data;
        }
        this.arrQueue.push(currUrl)
    }
}

export const getHtmlUrl = async (url) => {
    const userAgent = getUserAgent();
    const {data} = await axios.get(url, {
        headers: {
            "User-Agent": userAgent
        },
    });

    return data
}

export const getDocument = (html) => {
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html.toString(), {virtualConsole});
    return dom.window.document;
}

// Пример использования
// const imageUrls = [
//     'https://example.com/image1.jpg',
//     'https://example.com/image2.png',
//     // Добавьте другие URL-адреса изображений
// ];
//
// const outputDirectory = './downloaded_images';
//
// downloadImages(imageUrls, outputDirectory);

/**
 * Функция для загрузки изображений из массива URL
 * @param {Array} urls - Массив URL-адресов изображений
 * @param {String} outputDir - Директория для сохранения изображений
 * @param pfx
 * @param ext
 * @param max
 */
export async function downloadImages({arrUrl, outputDir, pfx = 'img-', ext = '.jfif', count = 10, timeout = 3000}) {
    let counter = 0.01
    let max = arrUrl.length;

    // Создаем директорию, если она не существует
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }

    // Загружаем изображения по каждому URL
    const arrOutNames = [], arrPromiseTask = [];
    const cv = new CreateVideo({dir_content: outputDir})

    const headers = {
        'Referer': 'http://localhost:5173/',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'max-age=0',
        'if-modified-since': 'Wed, 23 Aug 2023 14:09:26 GMT',
        'if-none-match': '"64e61316-12b4f"',
        'priority': 'u=0, i',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };


    async function loadAndSaveImage(url, outPath) {
        try {
            const {data} = await axios.get(url, {headers, responseType: 'arraybuffer', timeout});
            console.log(`Получено: ${url}`);
            await cv.toPng({arrayBuffer: data, outputPath: outPath})
        } catch (error) {
            console.error(`Ошибка при загрузке ${url}: ${error.message}`);
        } finally {
            counter++;
            if (global.messageSocket) (global.messageSocket).send({
                type: 'progress', data: counter / max * 100
            })
        }
    }

    for (let i = 0; i < arrUrl.length; i++) {
        if (i >= count) break;

        const url = arrUrl[i];
        // let outPath = pfx + i + ext;
        let outPath = pfx + toShortString(cyrb53(url)) + ext;
        arrOutNames.push(outPath)
        arrPromiseTask.push(loadAndSaveImage(url, outPath))
        // await loadAndSaveImage(url, outPath)
    }

    await Promise.allSettled(arrPromiseTask)

    const targetWidth = 1920; // Ширина
    const targetHeight = 1080; // Высота
    const backgroundColor = {r: 32, g: 32, b: 32, alpha: 0};
    await cv.packageResizeImage({arrPathImage: arrOutNames, ext: 'png', targetWidth, targetHeight, backgroundColor})
    console.log(`Загружено!!!`);

    global?.messageSocket?.send({type: 'progress', data: -1})

    return arrOutNames;
}

function secondsToTime(seconds) {
    return new Date(seconds * 1000).toISOString().slice(11, 22);
}

async function createSubtitle() {
    let news = await promises.readFile('./news.txt', 'utf8');

    let text = news.replaceAll(/[\r\n]/g, ' ')
// text = text.replaceAll(/[.,(){}\[\]]/g, ' ')
    text = text.replaceAll(/\s\s/g, ' ')

    const len = text.length;
    const tmsp = 2;
    const dur = 43;

    const cs = dur / len;

    const minSplitLen = Math.trunc(len / (dur / tmsp))

    let arrRes = [];

    while (1) {
        const si = text.lastIndexOf(' ', minSplitLen);
        if (si === -1) break;
        const it = text.slice(0, si)
        text = text.slice(text.lastIndexOf(' ', minSplitLen)).trim()
        arrRes.push(it);
    }
    arrRes.push(text);


    let acc = `
[Script Info]
; Script generated by FFmpeg/Lavc59.18.100
ScriptType: v4.00+
;PlayResX: 384
;PlayResY: 288
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,16,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    if (arrRes.length === 0) return;
    let tm = 0, _tm = 0, lastIndex = arrRes.length - 1;
    arrRes = arrRes.map((it, i) => {
        tm += it.length * cs
        if (lastIndex === i) tm += 1;
        const r = `Dialogue: 0,${secondsToTime(_tm)},${secondsToTime(tm)},Default,,0,0,0,,${it}`;
        _tm = tm;
        return r;
    })

    acc += arrRes.join('\n')

    await promises.writeFile('./sb.ass', acc);

    console.log(acc)
}

export class NewsUpdater {
    _listCompare = new Set();
    MIN_WORDS_TOPIC = 200;
    counter = 0;
    max = 1;
    short;
    HOST;
    db;
    getArrUrlOfType = () => console.error('not init getArrUrlOfType method');
    getDateAsMls = () => console.error('not init getDateAsMls method');
    getTitle = () => console.error('not init getTitle method');
    getArrTags = () => console.error('not init getArrTags method');
    getTextContent = () => console.error('not init getTextContent method');
    getHtmlUrl = () => {
        console.error('not init getHtmlUrl method');
        return null
    };
    getDocument = () => {
        console.error('not init getDocument method');
        return null
    };
    getSrcName = () => {
        console.error('not init getSrcName method');
        return null
    };
    getID = () => {
        console.error('not init getID method');
        return null
    };
    listTask;

    constructor({
                    host, listTask, db, getArrUrlOfType, getDateAsMls, getTitle, getArrTags,
                    getTextContent, getHtmlUrl, getDocument, getSrcName, getID, short
                }) {
        this.HOST = host;
        this.db = db;
        this.getArrUrlOfType = getArrUrlOfType;
        this.getDateAsMls = getDateAsMls;
        this.getTitle = getTitle;
        this.getArrTags = getArrTags;
        this.getTextContent = getTextContent;
        this.listTask = listTask;
        this.getHtmlUrl = getHtmlUrl;
        this.getDocument = getDocument;
        this.getSrcName = getSrcName;
        this.getID = getID;
        this.short = short;

    }

    async isExistID(db, id) {
        return !!db.getByID(id)
    }

    async updateOneNewsType(typeNews, url) {
        return await this.#fetchData({type: typeNews, url, host: this.HOST, isUpdate: true});
    }

    async updateByType(typeNews) {
        this._listCompare = new Set();
        this.counter = 0;
        // if (typeNews.length === 0) return
        try {
            const arrTask = Object.entries(typeNews.length ? {[typeNews]: this.listTask[typeNews]} : this.listTask);
            // const arrTask = Object.entries({[typeNews]: this.listTask[typeNews]});
            const promiseArrUrl = arrTask.map(([type, url]) => this.getArrUrlOfType(type, this.HOST + url));
            let arrListUrl = await Promise.allSettled(promiseArrUrl);
            arrListUrl = arrListUrl.map(it => it.value)

            // await writeData('./_urls.json', JSON.stringify(arrListUrl));

            const _DEBUG_ = false;
            let promises = [];

            for (let i = 0; i < arrListUrl.length; i++) {
                let it = arrListUrl[i];
                if (!it) {
                    console.error(`Индекс с ошибкой ${i}`);
                    continue;
                }
                const {type, arrUrl} = it;
                this.max += arrUrl.length;
                for (let i = 0; i < arrUrl.length; i++) {
                    const url = arrUrl[i];
                    let promiseFetchData = this.#fetchData({type, url, host: this.HOST});
                    if (_DEBUG_) await promiseFetchData; else promises.push(promiseFetchData);
                }
            }

            if (!_DEBUG_) await Promise.allSettled(promises);

        } catch (e) {
            console.error(e);
        } finally {
            this.counter = -1;
            if (global.messageSocket) (global.messageSocket).send({type: 'progress', data: -1})
        }
    }

    async #fetchData({type, url, host, isUpdate = false}) {
        try {
            if (url.startsWith('/')) url = host + url;
            if (!url.startsWith(host)) return;

            url = removeFragmentsFromUrl(url);

            const id = this.getID(url) ?? cyrb53(url);

            if (this._listCompare.has(id) && !isUpdate) {
                console.error(url, type);
                return null;
            }
            this._listCompare.add(id);

            const isExist = await this.isExistID(this.db, id);
            if (isExist && !isUpdate) {
                console.error(url, type);
                return null;
            }

            let html = await this.getHtmlUrl(url) ?? await getHtmlUrl(url);
            html = html.replaceAll(/\u00A0/g, ' ');

            const doc = await this.getDocument(html) ?? await getDocument(html);

            const title = this.getTitle(doc);
            if (!title || !title.length) return null;

            const tags = this.getArrTags(doc);
            if (!tags || !tags.length) return null;

            const date = this.getDateAsMls(doc);
            if (!date) return null;

            let text = this.getTextContent(doc);
            if (!text || !text.length || text.length < this.MIN_WORDS_TOPIC) return null;

            let from = this.getSrcName(doc) ?? '';

            let news = {
                date, url,
                type, from, short: this.short,
                title, tags: [],
                text, textGPT: null, textAdd: null,
                pathSrc: getPathSourceNews({id, title, date, short: this.short}), //путь до ресурсной директории
                arrImg: [], secPerFrame: 1.5,
                audioDur: 0,
                videoDur: 0,
                done: false,
            };

            this.db.add(id, news);

            return {id: cyrb53(url), url, title, tags, text, date, type}
        } catch (e) {
            console.log(e, url);
        } finally {
            this.counter++;
            if (global.messageSocket) (global.messageSocket).send({
                type: 'progress', data: this.counter / this.max * 100
            })
        }
        return null;
    }
}

export class ImageDownloadProcessor {
    #getMostFrequentLengthArray(arrays) {
        // Создаем объект для подсчета частоты длин массивов
        let _arr = Array(arrays.length * 2).fill(0);

        // Проходим по каждому массиву и подсчитываем частоту его длины
        arrays.forEach(arr => {
            const length = arr.length;
            if (_arr[length]) {
                _arr[length]++;
            } else {
                _arr[length] = 1;
            }
        });
        let maxIndex = 0;
        for (let i = 1; i < _arr.length; i++) {
            if (_arr[i] > _arr[maxIndex]) {
                maxIndex = i;
            }
        }
        return maxIndex;
    }

    #findClosingBrace(str) {
        let count = 0;

        for (let i = 0; i < str.length; i++) {
            if (str[i] === '{') {
                count++;
            } else if (str[i] === '}') {
                count--;
                if (count === 0) {
                    return i;
                }
            }
        }

        if (count !== 0) {
            throw new Error('Unmatched opening brace');
        }

        return -1; // Если не найдено закрывающей скобки
    }


    async #getImages(querySearch) {
        const headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'cookie': IMG_COOKIE,
            'priority': 'u=0, i',
            'sec-ch-prefers-color-scheme': 'dark',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-arch': '"x86"',
            'sec-ch-ua-bitness': '"64"',
            'sec-ch-ua-form-factors': '"Desktop"',
            'sec-ch-ua-full-version': '"131.0.6778.205"',
            'sec-ch-ua-full-version-list': '"Google Chrome";v="131.0.6778.205", "Chromium";v="131.0.6778.205", "Not_A Brand";v="24.0.0.0"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"19.0.0"',
            'sec-ch-ua-wow64': '?0',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'x-browser-channel': 'stable',
            'x-browser-copyright': 'Copyright 2024 Google LLC. All rights reserved.',
            'x-browser-validation': IMG_XBROWS_VALID,
            'x-browser-year': '2024',
            'x-client-data': IMG_XCLIENT
        };

        const qeryBuild = querySearch.split(' ').join('+')

        const queryEncode = encodeURIComponent(qeryBuild)

        const url = `https://www.google.com/search?q=${queryEncode}&udm=2&source=lnt&tbs=isz:l&sa=X`;

        try {
            const response = await axios.get(url, {headers, withCredentials: true});
            // console.log(response.data);
            return response.data
        } catch (error) {
            console.error('Error fetching personal feed:', error);
            return null;
        }
    }

    async getArrImage(searchRequest) {

        try {
            const html = await this.#getImages(searchRequest);
            if (html === null) throw 'ImageDownloadProcessor.getArrImage: не могу получить документ возможно нужно обновить кукисы';

            //дальше пытаемся обработать [Объект] внутри [документа] работая с ним как со строкой так быстрее

            const _pos = html.indexOf('gws-wiz-serp'); //ищем в тексте некий примитив который в данном документе встречается минимальное количество раз
            if (_pos === -1) throw 'ImageDownloadProcessor.getArrImage: скорее всего изменилась структура объекта';

            const _startPos = html.lastIndexOf('{', _pos) //теперь ищем в обратную сторону пока не встретим начало структуры (фигурная скобка)
            if (_startPos === -1) throw 'ImageDownloadProcessor.getArrImage: видимо что то пошло не так структура "съехала" или была сильно изменена';

            const _html = html.substring(_startPos)// получаем подстроку — начало структуры

            const _endPos = this.#findClosingBrace(_html) //ищем конец струкутры переберая все уровни вложенность подструкутр
            const objText = _html.substring(0, _endPos + 1); //наконец получаем структуру как строку
            const obj = JSON.parse(objText); //парсим в объект

            const _arr = Object.values(obj) //откидываем ключи оставляем значения и представляем как массив каждый элемент которого тоже массив но об этом далее
            const _indexArr = this.#getMostFrequentLengthArray(_arr); //находим самый часто встречающийся размер подмассива это в финале и будут массивы которые содержат ссылки на картинки
            const _arrImg = _arr.filter(v => v.length === _indexArr) //фильтруем подмассивы с нужно  длинной
            const _arrImgFlat = _arrImg.map(a => a.flat(5)) //так как каждый под массив содержит некую вложенность подмассиво делаем его плоским для удобства
            const __arrImg = _arrImgFlat.map(a => a.filter(it => (it + '').startsWith("https"))) //отыскиваем подмассивы которые содежат ссылки и мапим только их в новый массив
            return __arrImg.map(a => a.filter(it => !(it + '').startsWith("https://encrypted"))).flat(); //оставляем только прямые ссылки на кртинки

        } catch (e) {
            console.error(e)
            return null;
        }
    }
}

export async function overlayImages(baseImagePath, overlayImagePath, outputPath, x, y) {
    try {
        // Загружаем базовое изображение
        const baseImage = sharp(baseImagePath);

        // Загружаем изображение для наложения
        const overlayImage = sharp(overlayImagePath);

        // Получаем метаданные изображения для наложения
        const overlayMetadata = await overlayImage.metadata();

        // Создаем буфер для наложения
        const overlayBuffer = await overlayImage.toBuffer();

        // Накладываем изображение на базовое изображение
        const compositeImage = await baseImage
            .composite([{
                input: overlayBuffer, top: y, left: x, blend: 'over'
            }])
            .toFile(outputPath);

        console.log(`Изображение успешно сохранено в ${outputPath}`);
    } catch (error) {
        console.error('Ошибка при наложении изображений:', error);
    }
}

export function getPathSourceNews({id, title, date, short}) {
    const _date = formatDateTime(new Date(date), 'yy.mm.dd');
    let _title = title.replaceAll(/[^A-Za-zА-Яа-я ]/g, '')
    _title = translit(_title);
    _title = _title.toLocaleLowerCase().split(' ').map(it => it.slice(0, 3)).map(it => it.charAt(0).toUpperCase() + it.slice(1)).slice(0, 3).join('')
    const name = short + '-' + _title + '-' + toShortString(id);
    return `news/${_date}/${name}`;
}