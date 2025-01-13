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

export const updateImageSizes = async (arrImg, setArrImg) => {
    const updatedImages = await Promise.all(
        arrImg.map(async (src) => {
            const img = new Image();
            img.src = src;
            await img.decode();
            return {src, width: img.width, height: img.height,};
        })
    );
    setArrImg(updatedImages);
};

export function getNameAndDate(dt, url, id, listData, title) {
    const date = formatDateTime(new Date(dt), 'yy.mm.dd');
    let _title = title.replaceAll(/[^A-Za-zА-Яа-я ]/g, '')
    _title = translit(_title);
    _title = _title.toLocaleLowerCase().split(' ').map(it => it.slice(0, 3)).map(it => it.charAt(0).toUpperCase() + it.slice(1)).slice(0, 3).join('')
    const name = listData[(new URL(url)).host].short + '-' + _title + '-' + toShortString(id);
    return {date, name};
}

export let getArrTask = async () => {
    let {data} = await axios.get(glob.host + 'list-task');
    return data;
}

export let getData = async (from, to) => {
    let {data} = await axios.get(glob.host + 'list-news', {
        params: {
            from: (new Date(from)).getTime(),
            to: (new Date(to)).getTime() + 3600 * 24 * 1000
        }
    });
    data = data.map(it => {
        it.option = JSON.parse(it.option)
        return it;
    })
    return data;
}

type UpdateDBParams = {
    table?: any;
    values?: any;
    condition?: any;
    typeCond?: any;
};

export const updateDB: (task: object) => void = debounce(async (task: object) => {
    try {
        await axios.post(glob.host + 'update-db-task', task);
    } catch (e) {
        console.log(e)
    }
}, 500);