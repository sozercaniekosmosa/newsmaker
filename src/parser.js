import fs, {promises} from "fs";
import path from "path";
import axios from "axios";
import puppeteer from "puppeteer";
import translate from "@mgcodeur/super-translator";
import {JSDOM, VirtualConsole} from "jsdom";
import randUserAgent from "random-useragent";
import {asyncDelay, CreateVideo, cyrb53, formatDateTime, saveTextToFile, writeData, writeFileAsync} from "./utils.js";
import {HttpsProxyAgent} from "https-proxy-agent";
import Axios from "axios";
import {Database} from "./db.js";

function getUserAgent() {
    return randUserAgent.getRandom()
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
export async function getNewsList(from, to) {
    const db = new Database('./news.db')
    await db.connect();
    await db.run(`
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY,
                url TEXT,
                title TEXT,
                tags TEXT,
                text TEXT,
                dt INTEGER
            )
        `);
    let res;
    try {
        if (from && to) {
            res = await db.all(`SELECT * FROM news where dt>=? and dt<=? ORDER BY dt DESC`, [+from, +to]);
        } else {
            res = await db.all(`SELECT * FROM news ORDER BY dt DESC`);
        }
    } catch (e) {
    } finally {
        db.close();
    }

    return res;
}

export async function updateTG() {
    const HOST = 'https://www.theguardian.com';
    const date = formatDateTime(new Date(), 'yyyy.mm.dd')
    // let PATH = `../`;
    // let PATH_DATE = `${PATH}${date}`;

    const db = new Database('./news.db')
    await db.connect();
    // if (!await db.run(`SELECT name FROM sqlite_master WHERE type='table' AND name='news'`))
    await db.run(`
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY,
                url TEXT,
                title TEXT,
                tags TEXT,
                text TEXT,
                dt INTEGER
            )
        `);

    let html;
    // const strProxy = `200.10.40.164:19936:DMxoCo:kNu8Am\n200.10.40.158:9426:DMxoCo:kNu8Am\n131.108.17.228:9412:DMxoCo:kNu8Am`;
    // const req = new Requester(strProxy)
    // html = await req.getUrl(HOST);
    html = await getHtmlUrl(HOST + '/international')
    const body = getDocument(html).querySelector('body');
    let arrHref = ([...body.querySelectorAll('[id^="container-"] a')].map(a => a.href));

    let cnt = 0;
    writeData('./_urls.json', JSON.stringify(arrHref))

    async function fetchData(href) {
        try {

            if (href.startsWith('/')) href = HOST + href;
            if (!href.startsWith('http')) return;

            // SELECT id FROM news WHERE id = 2425107985663852
            const id = cyrb53(href);
            const arrSelect = await db.all(`SELECT * FROM news WHERE id = ?`, [id]);
            if (arrSelect.length) return;
            const {title, tags, text, date} = await getTheGuardianTopicUrl(href);
            if (!text || !tags || !text || !text.length || text.length < 50 || !title.length || !tags.length) return;
            console.log(cnt)

            await db.run(`INSERT INTO news (id, url, title, tags, text, dt) VALUES (?, ?, ?, ?, ?, ?)`, [cyrb53(href), href, title, tags, text, date]);


            cnt++;
        } catch (e) {
            console.log(e, cnt)
        }
        return href;
    }

    // for (let href of arrHref) {
    //     href = await fetchData(href);
    // }

    let promises = arrHref.map(url => fetchData(url));
    promises = promises.splice(0,2);
    const results = await Promise.allSettled(promises);

    await db.close()

    return cnt;
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
                ({data} = await Axios.create({httpsAgent}).get(url, {headers: {"User-Agent": userAgent}}));
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

// пример использования
// let htmlMain = await getHtmlUrl('https://www.theguardian.com/')
// await writeFileAsync('./data.html', htmlMain)
/**
 * Получить текст HTML по url
 * @param url
 * @returns {Promise<any>}
 */
export const getHtmlUrl = async (url) => {
    const userAgent = randUserAgent.getRandom();
    const {data} = await axios.get(url, {
        headers: {
            "User-Agent": userAgent
        },
    });

    return data
}

// пример использования
// const body = getDocument(data.toString()).querySelector('body');
// const arrHref = [...body.querySelectorAll('[id^="container-"] a')].map(a => a.href);
/**
 * Парсинг DOM
 * @param html
 * @returns {*}
 */
export const getDocument = (html) => {
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html.toString(), {virtualConsole});
    return dom.window.document;
}

// пример использования
// await getTheGuardianTopicUrl('1.txt', HOST + arrHref[0]);
/**
 * Получить новость The Guardian по url
 * @param url
 * @param maxTranslate
 * @returns {Promise<{ru: {title: string, arrText: string[], tags: string}, en: {title: *, arrText: string[], tags: string}}>}
 */
export async function getTheGuardianTopicUrl(url) {
    try {
        const html = await getHtmlUrl(url)
        const doc = getDocument(html);
        const titleEn = doc.title.replace('| The Guardian', '');
        const arrTags = [...doc.querySelectorAll('.dcr-1jl528t a')].map(node => node.textContent.toLocaleLowerCase())//.sort((a, b) => a.localeCompare(b))
        let tagsEn = arrTags.join(', ');
        const unfDate = [...doc.querySelectorAll('[data-gu-name="meta"] *')].filter(a => a.childElementCount === 0 && a.textContent.includes("GMT"))[0].textContent;
        const date = new Date(unfDate.slice(0, -3).trim().replace('.', ':')).getTime();
        const p = doc.querySelectorAll('#maincontent > div p'); //doc.querySelector('[data-gu-name="body"]').textContent

        if (!p) return null;

        let arrParagraphs = [...p]

        let paragraphText = '';
        for (let i = 0; i < arrParagraphs.length; i++) {
            const paragraph = arrParagraphs[i];

            //Удаление лишнего
            if (paragraph.closest('blockquote')) continue
            if (paragraph.textContent.toLocaleLowerCase().includes('editor’s note:')) continue
            if (paragraph.textContent.toLocaleLowerCase().includes('related article')) continue
            if (paragraph.textContent === "" || paragraph.textContent === ' ') continue

            paragraphText += paragraph.textContent.trim() + '\n';
        }

        return {
            title: titleEn, tags: tagsEn, text: paragraphText, date
        }
    } catch (e) {
        throw e;
    }
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
export async function downloadImages({arrUrl, outputDir, pfx = 'img-', ext = '.jfif', max = 10}) {
    // Создаем директорию, если она не существует
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }

    // Загружаем изображения по каждому URL
    const arrOutNames = [];
    const cv = new CreateVideo({dir_content: outputDir})
    for (let i = 0; i < arrUrl.length; i++) {
        if (i >= max) break;
        const url = arrUrl[i];

        const fileName = path.basename(url);
        const filePath = path.join(outputDir, pfx + i + ext);
        arrOutNames.push(pfx + i + ext)
        try {
            const {data} = await axios.get(url, {responseType: 'arraybuffer',});
            // Сохраняем файл на диск
            // await writeFileAsync(filePath, data);
            cv.toPng({arrayBuffer: data, outputPath: pfx + i + ext})
            // console.log(`Загружено: ${fileName}`);
        } catch (error) {
            console.error(`Ошибка при загрузке ${url}: ${error.message}`);
        }
    }
    const targetWidth = 1920; // Ширина
    const targetHeight = 1080; // Высота
    const backgroundColor = {r: 32, g: 32, b: 32, alpha: 0};
    await cv.packageResizeImage({numImages: arrUrl.length, ext: 'png', targetWidth, targetHeight, backgroundColor})
    console.log(`Загружено!!!`);

    return arrOutNames;
}

export async function getArrUrlsImageDDG2(querySearch, max = 5) {

    const loadUrl = async (page, url) => {
        try {
            await page.goto(url, {
                timeout: 20000, waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
            })
        } catch (error) {
            throw new Error("url " + url + " url not loaded -> " + error)
        }
    }

    const qeryBuild = querySearch.split(' ').join('+')

    const queryEncode = encodeURIComponent(qeryBuild)

    let devtools = false;
    let headless = devtools ? false : 'shell';

    const browser = await puppeteer.launch({
        headless, args: ["--fast-start", "--disable-extensions", "--no-sandbox"], ignoreHTTPSErrors: true, devtools
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    await loadUrl(page, `https://duckduckgo.com/?q=${queryEncode}&t=h_&iar=images&iax=images&ia=images&iaf=size%3ALarge%2Clicense%3AModifyCommercially`)
    // await loadUrl(page, `https://duckduckgo.com/?q=${queryEncode}&t=h_&iar=images&iax=images&ia=images&iaf=license%3AModifyCommercially`)
    // await loadUrl(page, `https://www.google.com/search?q=${queryEncode}&udm=2&source=lnt&tbs=isz:l&sa=X`)

    await page.setViewport({width: 1080, height: 1024});

    const arrUrlImage = await page.evaluate((max) => {
        const arrUrlImage = [...document.querySelectorAll('.tile-wrap img')].slice(0, max);
        let _arrUrlImage = []
        debugger

        for (let i = 1; i < arrUrlImage.length; i += 3) {
            const node = arrUrlImage[i];
            node.click();
            _arrUrlImage.push(document.querySelectorAll('.detail .detail__media.detail__media--images a')[0].href);
            _arrUrlImage.push(document.querySelectorAll('.detail .detail__media.detail__media--images a')[1].href);
            _arrUrlImage.push(document.querySelectorAll('.detail .detail__media.detail__media--images a')[2].href);
        }

        return _arrUrlImage;
    }, max);
    console.log(arrUrlImage)
    await browser.close();

    return arrUrlImage;
}

export async function getArrUrlsImageDDG(querySearch) {

    const loadUrl = async (page, url) => {
        try {
            await page.goto(url, {
                timeout: 20000, waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
            })
        } catch (error) {
            throw new Error("url " + url + " url not loaded -> " + error)
        }
    }

    const qeryBuild = querySearch.split(' ').join('+')

    const queryEncode = encodeURIComponent(qeryBuild)

    let headless = true;
    // const browser = await puppeteer.launch({headless, args: ['--disable-features=site-per-process']});
    // const browser = await puppeteer.launch({
    //     headless: true,
    //     args: ["--fast-start", "--disable-extensions", "--no-sandbox"],
    //     ignoreHTTPSErrors: true
    // });
    const browser = await puppeteer.launch({
        headless: 'shell', args: ["--fast-start", "--disable-extensions", "--no-sandbox"], ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();

    await loadUrl(page, `https://duckduckgo.com/?q=${queryEncode}&t=h_&iar=images&iax=images&ia=images&iaf=license%3AModifyCommercially`)

    // await page.goto(`https://duckduckgo.com/?q=${queryEncode}&t=h_&iar=images&iax=images&ia=images`);
    // await page.waitForNavigation(1000);
    // page.waitForNavigation({
    //     waitUntil: 'networkidle0',
    // })

    // await page.waitForNavigation();

// Set screen size.
    if (headless === false) await page.setViewport({width: 1080, height: 1024});

    const arrUrlImage = await page.evaluate(() => {
        return [...document.querySelectorAll('.tile-wrap img')].map(node => node.src)
    });


    await browser.close();

    return arrUrlImage;

    /*
    // Type into search box.
    await page.locator('.devsite-search-field').fill('automate beyond recorder');

    // Wait and click on first result.
    await page.locator('.devsite-result-item-link').click();

    // Locate the full title with a unique string.
    const textSelector = await page
        .locator('text/Customize and automate')
        .waitHandle();
    const fullTitle = await textSelector?.evaluate(el => el.textContent);

    // Print the full title.
    console.log('The title of this blog post is "%s".', fullTitle);

    // await browser.close();*/
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