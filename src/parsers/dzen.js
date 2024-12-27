import {cyrb53, removeFragmentsFromUrl, writeData} from "../utils.js";
import {connectDB, getDocument, getHtmlUrl} from "../parser.js";


const listTask = {
    world: '/world',
    now: '/chronologic',//++
    interest: '/personal_feed',//++
    politics: '/politics',
    social: '/society',
    business: '/business',
    svo: '/svo',
    showbusiness: '/showbusiness?utm_source=yxnews&utm_medium=desktop',//++
    incidents: '/incident',
    culture: '/culture',
    technology: '/computers',
    science: '/science',
    auto: '/auto',//++
};


async function getArrUrlOfType(type, url) { // получаем ссылки на статьи
    const html = await getHtmlUrl(url);
    const body = getDocument(html).querySelector('body');

    // let urlToPartOfNews = body.querySelector('.listing__button').dataset.href.split('/').slice(0, -1).join('/') + '/'
    // let urlToPartOfNews = body.querySelector('.listing__button').dataset.href

    const query = url.includes('/trend/') ? '.listing__trend .card__heading a' : '.rows__column_section-index_left .listing__rows .card__heading a'

    const arrUrl = [...body.querySelectorAll(query)].map(a => a.href);
    return {type, arrUrl};
}

function getTitle(doc) { // получить заголовок
    return doc.title.replaceAll(/ — РТ на русском/g, '');
}

function getDateAsMls(doc) { // получить время в мс
    try {
        const unfDate = doc.querySelector('.article__date .date').getAttribute('datetime');
        return (new Date(unfDate)).getTime()
    } catch (e) {
        console.error(e)
    }
}

function getArrTags(doc) { // получить теги
    let arrTags = [...doc.querySelectorAll('.tags-trends a')].map(node => node.textContent.trim().toLocaleLowerCase());
    return arrTags.join(', ');
}

function getTextContent(doc) { //получить текст новости
    const summary = '===\n' + doc.querySelector('.article__summary').textContent + '\n===\n'; //doc.querySelector('[data-gu-name="body"]').textContent
    const p = doc.querySelectorAll('.article__text p'); //doc.querySelector('[data-gu-name="body"]').textContent
    if (!p) return null;

    let arrParagraphs = [...p];

    // let paragraphText = ''
    // for (let i = 0; i < arrParagraphs.length; i++) {
    //     const paragraph = arrParagraphs[i];
    //
    //     //Удаление лишнего
    //     if (paragraph.closest('blockquote')) continue
    //     if (paragraph.textContent === "" || paragraph.textContent === ' ') continue
    //
    //     paragraphText += paragraph.textContent.trim() + '\n';
    // }

    return summary + arrParagraphs.map(p => p.textContent.replaceAll(/\u00A0/g, ' ')).join('\n');
}

export default {
    listTask,
    getDateAsMls,
    getArrTags,
    getTextContent,
    getTitle,
    getArrUrlOfType,
}