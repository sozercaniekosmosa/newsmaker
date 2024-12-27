import {getDocument, getHtmlUrl} from "../parser.js";


const listTask = {
    world: '/world',
    europeNews: '/world/europe-news',
    usa: '/us-news',
    americas: '/world/americas',
    asia: '/world/asia',
    australia: '/australia-news',
    africa: '/world/africa',
    middleeast: '/world/middleeast',
    science: '/science',
    technology: '/uk/technology',
    business: '/uk/business',
    football: '/football',
    cycling: '/sport/cycling',
    formulaone: '/sport/formulaone',
    books: '/books',
    tvRadio: '/uk/tv-and-radio',
    art: '/artanddesign',
    film: '/uk/film',
    games: '/games',
    classical: '/music/classical-music-and-opera',
    stage: '/stage'
};

function getDateAsMls(doc) { // получить время в мс
    try {
        let unfDate = [...doc.querySelectorAll('[data-gu-name="meta"] *')].filter(a => a.childElementCount === 0 && a.textContent.includes("GMT") || a.textContent.includes("BST"))[0].textContent
        return new Date(unfDate.slice(0, -3).trim().replace('.', ':')).getTime()
    } catch (e) {
        console.error(e)
    }
}

function getArrTags(doc) { // получить теги
    let arrTags = [...doc.querySelectorAll('.dcr-1jl528t a')].map(node => node.textContent.toLocaleLowerCase());
    return arrTags.join(', ');
}

function getTextContent(doc) { //получить текст новости
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

function getTitle(doc) { // получить заголовок
    return doc.title.replace('| The Guardian', '');
}

async function getArrUrlOfType(type, url) { // получаем ссылки на статьи
    const html = await getHtmlUrl(url);
    const body = getDocument(html).querySelector('body');
    return {type, arrUrl: ([...body.querySelectorAll('[id^="container-"] a')].map(a => a.href))};
}

export default {
    listTask,
    getDateAsMls,
    getArrTags,
    getTextContent,
    getTitle,
    getArrUrlOfType,
}