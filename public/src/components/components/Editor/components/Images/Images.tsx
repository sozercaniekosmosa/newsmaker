import React, {useState} from "react";
import ButtonSpinner from "../../../ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";
import {getNameAndDate, updateImageSizes} from "../../../../utils";
import axios from "axios";
import globals from "globals";
import glob from "../../../../../global.ts";
import Dialog from "../../../Dialog/Dialog.tsx";

export default function Images({news, setNews, arrImg, setArrImg, listHostToData}) {
    const [stateImageLoad, setStateImageLoad] = useState(0)


    async function requestImages() {
        setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt, titleEn} = news;

            const selectedText = glob.selectedText;
            const prompt = selectedText ?? news.tagsEn;

            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const {data: arrSrc} = await axios.get(glob.host + 'images', {params: {prompt, name, max: 10, date}});
            setStateImageLoad(0)
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))
            await updateImageSizes(arrSrc, setArrImg);
            // console.log(arrSrc)
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
        }
    }

    return <div className="d-flex flex-column w-100 notranslate">
                        <textarea className="options__tags d-flex flex-row border rounded mb-1 p-2 notranslate" value={news?.tagsEn || ''}
                                  onChange={({target}) => setNews(was => ({...was, tagsEn: target.value}))} style={{height: '5em'}}/>
        <ButtonSpinner className="btn-secondary btn-sm mb-1" state={stateImageLoad}
                       onClick={requestImages}>
            Загрузить изображения
        </ButtonSpinner>
        <div className="flex-stretch operation__img no-resize border rounded mb-1">
            <Gallery galleryID="my-test-gallery" images={arrImg}/>
        </div>
    </div>
}