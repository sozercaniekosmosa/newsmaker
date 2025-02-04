import {debounce, formatDateTime, toShortString} from "../utils.ts";
import axios from "axios";
import glob from "../global.ts";

export function translit(str) {
    const converter = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
        'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '_',
        'ы': 'y',
        'ь': '_',
        'э': 'e',
        'ю': 'yu',
        'я': 'ya'
    };

    let result = '';
    for (let i = 0; i < str.length; i++) {
        const char = str[i].toLocaleLowerCase();
        result += converter[char] || char;
    }
    return result;
}

export let getTasks = async () => {
    let {data} = await axios.get(glob.hostAPI + 'list-task' + '?upd=' + new Date().getTime());
    return data;
}

export let getData = async (from, to) => {
    let {data} = await axios.get(glob.hostAPI + 'list-news' + '?upd=' + new Date().getTime(), {
        params: {
            from: (new Date(from)).getTime(),
            to: (new Date(to)).getTime() + 3600 * 24 * 1000
        }
    });
    return data;
}

type UpdateDBParams = {
    table?: any;
    values?: any;
    condition?: any;
    typeCond?: any;
};

export const updateTaskDBForced = async (task: object) => {
    if (!task) return;
    try {
        await axios.post(glob.hostAPI + 'update-db-task', task);
    } catch (e) {
        console.log(e)
    }
}

export const updateTaskDB: (task: object) => void = debounce(async (task: object) => {
    if (!task) return;
    try {
        await axios.post(glob.hostAPI + 'update-db-task', task);
    } catch (e) {
        console.log(e)
    }
}, 500);
export const updateNewsDB: (news: object) => any = debounce(async (news: object) => {
    if (!news) return null;
    try {
        await axios.post(glob.hostAPI + 'update-db-news', news);
    } catch (e) {
        console.log(e)
    }
}, 500);

export async function toGPT(type: string, promptCmd = null, textContent: string) {
    textContent = glob.selectedText ?? textContent;
    try {
        const {data: text} = await axios.post(glob.hostAPI + 'gpt', {
            type,
            text: textContent,
            prompt: promptCmd ?? prompt
        });

        if (text.toLocaleLowerCase().includes('в интернете есть много сайтов с информацией на эту')) throw 'ошибка';

        return text;
    } catch (e) {
        console.log(e)
        return null;
    }
}

export function extractDimensionsFromUrl(url: string) {
    const regex = /-(\d+)x(\d+)\.png/;
    const match = url.match(regex);

    if (match) {
        const width = match[1];
        const height = match[2];
        return {width, height};
    } else {
        return null;
    }
}
