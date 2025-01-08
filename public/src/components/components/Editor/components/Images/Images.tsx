import React, {useEffect, useState} from "react";
import ButtonSpinner from "../../../ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";
import {getNameAndDate, updateImageSizes} from "../../../../utils";
import axios from "axios";
import glob from "../../../../../global.ts";

let currID;
export default function Images({news, setNews, arrImg, setArrImg, listHostToData, maxImage}) {
    const [stateImageLoad, setStateImageLoad] = useState(0)
    const [quantity, setQuantity] = useState(5);
    const [timeout, setTimeout] = useState(3);

    useEffect(() => {
        if (currID == news?.id) return;
        currID = news.id;

        setArrImg([])
    }, [news])

    async function requestImages() {
        setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt, titleEn} = news;

            const selectedText = glob.selectedText;
            const prompt = selectedText ?? news.tagsEn;

            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const {data: {arrUrl, id: respID}} = await axios.get(glob.host + 'images',
                {params: {prompt, name, max: quantity, date, id, timeout: timeout * 1000}});
            setStateImageLoad(0)

            if (currID !== +respID) return; //TODO: переделать
            setArrImg(arrUrl.map(src => ({src, width: undefined, height: undefined,})))
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
        }
    }

    return <div className="d-flex flex-column w-100 notranslate position-relative">
                        <textarea className="options__tags d-flex flex-row border rounded mb-1 p-2 notranslate" value={news?.tagsEn || ''}
                                  onChange={({target}) => setNews(was => ({...was, tagsEn: target.value}))} style={{height: '5em'}}/>
        <div className="d-flex flex-row mb-1">
            <ButtonSpinner className="btn-secondary btn-sm" state={stateImageLoad}
                           onClick={requestImages}>
                Загрузить изображения
            </ButtonSpinner>
            <input className="rounded border text-end ms-2 flex-stretch" type="range" value={quantity} min={5} max={20}
                   step={1} onChange={({target}) => setQuantity(+target.value)} title="Количество изображений"/>
            <span className="p-1 text-center" style={{width: '3em'}}>{quantity}</span>
            <input className="rounded border text-end ms-2 flex-stretch" type="range" value={timeout} min={1} max={20}
                   step={1} onChange={({target}) => setTimeout(+target.value)} title="Таймаут"/>
            <span className="p-1 text-center" style={{width: '3.5em'}}>{timeout + ' сек'}</span>
        </div>
        <div className="flex-stretch operation__img border rounded mb-1">
            <Gallery galleryID="my-test-gallery" images={arrImg}/>
        </div>
        <div className="position-absolute" style={{bottom: '6px', right: '6px', opacity: .5}}>
            Всего: {arrImg.length} ({maxImage} сек)
        </div>
    </div>
}