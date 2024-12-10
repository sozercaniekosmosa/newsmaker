import {cyrb53, removeFragmentsFromUrl, writeData} from "./utils.js";
import {connectDB, getDocument, getHtmlUrl} from "./parser.js";

let counter = 0;
let max = 1;


export async function updateTG(typeNews) {
    const HOST = 'https://www.theguardian.com';

    counter = 0;
    const listTask = {
        international: '/international', world: '/world', europeNews: '/world/europe-news', usNews: '/us-news',
        americas: '/world/americas', asia: '/world/asia', australia: '/australia-news', africa: '/world/africa',
        middleeast: '/world/middleeast', science: '/science', technology: '/uk/technology', business: '/uk/business',
        football: '/football', cycling: '/sport/cycling', formulaone: '/sport/formulaone', books: '/books',
        tvRadio: '/uk/tv-and-radio', art: '/artanddesign', film: '/uk/film', games: '/games',
        classical: '/music/classical-music-and-opera', stage: '/stage'
    }

    try {
        const db = await connectDB();

        const arrTask = Object.entries(typeNews ? {[typeNews]: listTask[typeNews]} : listTask);
        const promiseArrUrl = arrTask.map(([type, url]) => getArrTypeUrl(type, HOST + url))
        const arrListUrl = await Promise.allSettled(promiseArrUrl);


        await writeData('./_urls.json', JSON.stringify(arrListUrl))

        const _DEBUG_ = false;
        let promises = [];

        for (let i = 0; i < arrListUrl.length; i++) {
            let it = arrListUrl[i].value;
            if (!it) console.error(`Индекс с ошибкой ${i}`);
            const {type, arrUrl} = it;
            max = arrUrl.length;
            for (let i = 0; i < arrUrl.length; i++) {
                const url = arrUrl[i];
                let promiseFetchData = fetchData({type, url, db, host: HOST});
                if (_DEBUG_) await promiseFetchData; else promises.push(promiseFetchData);
            }
        }

        if (!_DEBUG_) await Promise.allSettled(promises);

        await db.close();
    } catch (e) {
        console.error(e)
    } finally {
        counter = -1;
    }
}

function getUnfDate(doc) {
    try {
        let unfDate = [...doc.querySelectorAll('[data-gu-name="meta"] *')].filter(a => a.childElementCount === 0 && a.textContent.includes("GMT") || a.textContent.includes("BST"))[0].textContent
        return new Date(unfDate.slice(0, -3).trim().replace('.', ':')).getTime()
    } catch (e) {
        console.error(e)
    }
}

function getArrTags(doc) {
    let arrTags = [...doc.querySelectorAll('.dcr-1jl528t a')].map(node => node.textContent.toLocaleLowerCase());
    return arrTags.join(', ');
}

function getParagrafText(doc) {
    const p = doc.querySelectorAll('#maincontent > div > p'); //doc.querySelector('[data-gu-name="body"]').textContent

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
    return paragraphText;
}

function getTitle(doc) {
    return doc.title.replace('| The Guardian', '');
}

async function fetchData({type, url, host, db}) {
    try {
        if (url.startsWith('/')) url = host + url;
        if (!url.startsWith(host)) return;

        url = removeFragmentsFromUrl(url)

        const id = cyrb53(url);

        if (await isExistID(db, id)) {
            console.error(url, type)
            return null;
        }

        const html = await getHtmlUrl(url)
        const doc = getDocument(html);

        const titleEn = getTitle(doc);

        const tagsEn = getArrTags(doc)
        if (tagsEn.length === 0) return null;

        const date = getUnfDate(doc);

        let paragraphText = getParagrafText(doc);
        if (paragraphText === null) return null;

        const title = titleEn;
        const tags = tagsEn;
        const text = paragraphText;

        if (!text || !text.length || text.length < 50 || !title.length || !tags || !tags.length || !date) return;


        await db.run(`INSERT INTO news (id, url, title, tags, text, dt, type) VALUES (?, ?, ?, ?, ?, ?, ?)`, [cyrb53(url), url, title, tags, text, date, type]);
    } catch (e) {
        console.log(e, url)
    } finally {
        counter++;
    }
}

export const getCurrentProgress = () => {
    if (counter === -1) return false;
    return counter / max * 100
}

async function getArrTypeUrl(type, url) {
    const html = await getHtmlUrl(url);
    const body = getDocument(html).querySelector('body');
    return {type, arrUrl: ([...body.querySelectorAll('[id^="container-"] a')].map(a => a.href))};
}

const isExistID = async (db, id) => (await db.all(`SELECT * FROM news WHERE id = ?`, [id])).length > 0;
