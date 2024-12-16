import {formatDateTime, toShortString} from "../utils.ts";
import axios from "axios";

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

export function getSourcePrefix(str) {
    if (str.includes('theguardian')) return 'tg'
}

export function getNameAndDate(dt, url, id) {
    const date = formatDateTime(new Date(dt), 'yy.mm.dd');
    const name = getSourcePrefix(url) + '-' + toShortString(id);
    return {date, name};
}

export let getData = async (host, from, to) => {
    let {data} = await axios.get(host + 'news', {
        params: {
            from: (new Date(from)).getTime(),
            to: (new Date(to)).getTime()
        }
    });
    data = data.map(it => {
        it.option = JSON.parse(it.option)
        return it;
    })
    return data;
}