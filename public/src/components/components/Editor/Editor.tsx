import React, {useEffect, useState} from 'react';
import 'photoswipe/style.css';
import Gallery from "../Gallery/Gallery";
import axios from "axios";
import {getNameAndDate, updateImageSizes} from "../../utils.ts";
import './style.css'
import {Tab, Tabs} from "react-bootstrap";
import {debounce} from "../../../utils.ts";

let currID;

const writeChange: (news, text, host) => void = debounce(async (news, text, host) => {
    if (!news) return;
    const {id, url, dt} = news;
    const {date, name} = getNameAndDate(dt, url, id);
    await axios.post(host + 'save', {path: `news\\${date}\\${name}\\news.txt`, data: text});
}, 1000)

export default function Editor({setNews, news, arrImg, setArrImg, host, textGPT, setTextGPT, setIsExistAudio}) {
    useEffect(() => {
        if (!news) return;
        if (currID === news.id) return;
        currID = news.id;
        setTextGPT('')
        getLocalSource(news);
    }, [news])

    useEffect(() => {
        // debugger
        // console.log(textGPT)
        writeChange(news, textGPT, host)
    }, [textGPT]);

    const getLocalSource = async (news): Promise<void> => {
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            const {data: {arrImgUrls: arrSrc, textContent, isExistAudio}} = await axios.get(host + 'local-data', {params: {name, date}});
            setTextGPT(textContent);
            setIsExistAudio(isExistAudio)
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))
            await updateImageSizes(arrSrc, setArrImg);
        } catch (e) {
            setArrImg([])
        }
    }

    return (
        <div className="options d-flex flex-column h-100">
            <textarea className="options__title d-flex flex-row input-text" value={news?.title || ''}
                      onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
            <textarea className="options__tags d-flex flex-row" value={news?.tagsEn || ''}
                      onChange={({target}) => setNews(was => ({...was, tagsEn: target.value}))}/>
            <Tabs defaultActiveKey="original" className="mb-3 notranslate">
                <Tab eventKey="original" title="Оригинал" style={{flex: 1}} className="">
                    <textarea className="flex-stretch options__text" value={news?.text || ''}
                              onChange={({target}) => setNews(was => ({...was, text: target.value}))}/>
                </Tab>
                <Tab eventKey="handled" title="Обаработанный" style={{flex: 1}}>
                    <textarea className="flex-stretch options__text" value={textGPT || ''} onChange={({target}) => setTextGPT(target.value)}/>
                </Tab>
                <Tab eventKey="iamges" title="Картинки">
                    <div className="flex-stretch operation__img">
                        <Gallery galleryID="my-test-gallery" images={arrImg}/>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
}