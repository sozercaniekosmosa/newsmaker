import {cyrb53, removeFragmentsFromUrl, writeData} from "./utils.js";
import {connectDB, getDocument, getHtmlUrl} from "./parser.js";


export function getUnfDate(doc) {
    try {
        let unfDate = [...doc.querySelectorAll('[data-gu-name="meta"] *')].filter(a => a.childElementCount === 0 && a.textContent.includes("GMT") || a.textContent.includes("BST"))[0].textContent
        return new Date(unfDate.slice(0, -3).trim().replace('.', ':')).getTime()
    } catch (e) {
        console.error(e)
    }
}

export function getArrTags(doc) {
    let arrTags = [...doc.querySelectorAll('.dcr-1jl528t a')].map(node => node.textContent.toLocaleLowerCase());
    return arrTags.join(', ');
}

export function getTextContent(doc) {
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

export function getTitle(doc) {
    return doc.title.replace('| The Guardian', '');
}

export async function getArrUrlOfType(type, url) {
    const html = await getHtmlUrl(url);
    const body = getDocument(html).querySelector('body');
    return {type, arrUrl: ([...body.querySelectorAll('[id^="container-"] a')].map(a => a.href))};
}

export async function isExistID(db, id) {
    return (await db.all(`SELECT * FROM news WHERE id = ?`, [id])).length > 0;
}