import {debounce, formatDateTime, toShortString} from "../utils.ts";
import axios from "axios";
import glob from "../global.ts";

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
    const _title = title.replaceAll(/[^A-Za-zА-Яа-я ]/g, '').toLocaleLowerCase().split(' ').map(it => it.slice(0, 3)).map(it => it.charAt(0).toUpperCase() + it.slice(1)).slice(0, 3).join('')
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
export const updateDB: (params: UpdateDBParams) => void =
    debounce(async ({table = null, values, condition = null, typeCond = null}) => {
        try {
            await axios.post(glob.host + 'update-db', {table, values, condition, typeCond});
        } catch (e) {
            console.log(e)
        }
    }, 500);