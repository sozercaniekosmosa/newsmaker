import {cyrb53, removeFragmentsFromUrl, writeData} from "../utils.js";
import {connectDB, getDocument, getHtmlUrl} from "../parser.js";


const listTask = {
    business: '/business', //+
    // world
    world: '/world', //+
    gaza: '/trend/1215841-izrail-palestina-konflikt',
    politics: '/trend/335105-vneshnyaya-politika',
    sanctions: '/trend/346584-sankcii',

    middleeast: '/trend/335108-blizhnii-vostok',//+
    europeNews: '/trend/335114-evropa',//+
    africa: '/trend/365491-afrika',//+
    asia: '/trend/336983-aziya',//+

    //ru
    politicsrus: '/trend/334937-politika',
    incidents: '/trend/334955-proisshestviya',
    social: '/trend/334939-obschestvo',
    belorus: '/trend/905563-soyuznoe-gosudarstvo',
    army: '/trend/334946-armiya',
    regions: '/trend/631759-regiony',
    investigation: '/trend/585226-rassledovaniya-rt',

    //ussr
    svo: '/trend/355231-donbass',
    moldova: '/trend/341928-moldaviya',
    pribalty: '/trend/334988-pribaltika',
    kavkaz: '/trend/334989-zakavkaze',

    science: '/trend/669652-rossiiskaya-nauka',//+
    cosmos: '/trend/334964-kosmos',
    medicine: '/trend/334967-medicina',
    biology: '/trend/340458-biologiya',
    history: '/trend/334961-istoriya',
    archeology: '/trend/669660-arheologiya',
    technology: '/trend/335010-tehnologii',//+
    ecology: '/trend/339941-ekologiya',
    physics: '/trend/342637-fizika',
    chemistry: '/trend/669653-himiya',
    sociology: '/trend/334966-socialnye-nauki',


    //sport
    football: '/trend/334889-futbol',//+
    tennis: '/trend/334925-tennis',
    fighting: '/334894-boks-mma',
    hokkey: '/trend/334891-hokkei',
    figures: '/trend/334898-figurnoe-katanie',
    summer: '/334947-letnie-vidy',
    winter: '/trend/334948-zimnie-vidy',


    culture: '/trend/335012-kultura',
    internet: '/trend/335007-internet',
    entertainment: '/trend/378010-razvlecheniya',
    socialnetworks: '/trend/335015-socseti',
    nature: '/trend/345585-priroda',
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