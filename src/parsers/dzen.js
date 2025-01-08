import axios from "axios";
import {addHour, addMinute, cyrb53, formatDateTime} from "../utils.js";
import * as chrono from "chrono-node";
import {config} from "dotenv";

const {parsed: {DZEN_COOKIE}} = config();

const listTask = {
    world: '/rubric/world',
    // now: '/rubric/chronologic',//++
    interest: '/rubric/personal_feed',//++
    politics: '/rubric/politics',
    social: '/rubric/society',
    business: '/rubric/business',
    svo: '/rubric/svo',
    showbusiness: '/rubric/showbusiness?utm_source=yxnews&utm_medium=desktop',//++
    incidents: '/rubric/incident',
    culture: '/rubric/culture',
    technology: '/rubric/computers',
    science: '/rubric/science',
    auto: '/rubric/auto',//++
};

const getID = (url) => {

    let _url = new URL(url);
    _url.searchParams.delete('t');
    _url.searchParams.delete('rubric');

    return cyrb53(_url.toString());
}

async function getDocument(html) {
    try {
        const ss = 'window.Ya.Neo={'
        const pos = html.indexOf(ss)
        const textObj = html.substring(pos + ss.length - 1, html.indexOf('</script>', pos))

        const obj = JSON.parse(textObj);

        return obj
    } catch (e) {
        console.log(e)
    }
}

async function getHtmlUrl(url) {
    const headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Cookie': DZEN_COOKIE,
        'Host': 'dzen.ru',
        // 'Referer': 'https://dzen.ru/news?utm_referrer=www.google.com',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    };

    try {
        const response = await axios.get(url, {headers, withCredentials: true});
        // console.log(response.data);
        return response.data
    } catch (error) {
        console.error('Error fetching personal feed:', error);
        return null;
    }
}

function getSrcName(doc) { // получаем имя оригинального источника
    return doc.dataSource.news.story.summarization.items[0].sourceName
}

async function getArrUrlOfType(type, url) { // получаем ссылки на статьи
    const html = await getHtmlUrl(url);
    // const script = getDocument(html).querySelector('script').textContent;
    // let searchStr = 'window.Ya.Neo={';
    // const posStart = script.indexOf(searchStr);
    // if (posStart === -1) return null;
    // const textObj = script.substring(posStart + searchStr.length - 1)

    const ss = 'window.Ya.Neo={'
    const pos = html.indexOf(ss)
    const textObj = html.substring(pos + ss.length - 1, html.indexOf('</script>', pos))

    const obj = JSON.parse(textObj);
    const arrNews = obj.dataSource.news.parentFeed;

    const arrUrl = arrNews.map(news => news.url);
    console.log(arrNews)
    return {type, arrUrl};
}

function getTitle(doc) { // получить заголовок
    return doc.dataSource.news.story.title;
}

function getDateAsMls(doc) { // получить время в мс
    try {
        let unfDate;
        unfDate = doc.dataSource.news.story.time.toLocaleLowerCase();

        const date = chrono.ru.parseDate(unfDate)
        // console.log(unfDate)
        return date.getTime();
    } catch (e) {
        console.error(e)
    }
}

function getArrTags(doc) { // получить теги
    return doc.dataSource.news.story.title;
}

function getTextContent(doc) { //получить текст новости
    const text = doc.dataSource.news.story.summarization.items.map(it => it.text).join(' ');
    return text;
}

export default {
    listTask,
    getDateAsMls,
    getArrTags,
    getTextContent,
    getTitle,
    getArrUrlOfType,
    getHtmlUrl,
    getDocument,
    getSrcName,
    getID
}