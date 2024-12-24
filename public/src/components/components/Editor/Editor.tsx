import React, {useEffect, useRef, useState} from 'react';
import 'photoswipe/style.css';
import Gallery from "./components/Gallery/Gallery";
import axios from "axios";
import {getData, getNameAndDate, updateDB, updateImageSizes} from "../../utils.ts";
import './style.css'
import {Button, ButtonGroup, Image, Tab, Tabs} from "react-bootstrap";
import {addDay, debounce, eventBus, formatDateTime, getSelelected, insertAt} from "../../../utils.ts";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import GPT from "./components/GPT/GPT";
import Images from "./components/Images/Images";
import glob from "../../../global.ts";

let currID;

const writeChange: (news, text, list) => void = debounce(async (news, text, list) => {
    if (!news) return;
    const {id, url, dt, title, titleEn} = news;
    const {date, name} = getNameAndDate(dt, url, id, list, titleEn);
    await axios.post(glob.host + 'save-text', {path: `news\\${date}\\${name}\\news.txt`, data: text});
}, 1000)

export default function Editor({arrNews, setArrNews, news, setNews, listHostToData}) {

    const [stateUpdateAnNews, setStateUpdateAnNews] = useState(0)
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [arrImg, setArrImg] = useState([])
    const [textGPT, setTextGPT] = useState('')
    const [isExistAudio, setIsExistAudio] = useState(false)
    const [isExistVideo, setIsExistVideo] = useState(false)
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [update, setUpdate] = useState((new Date()).getTime())

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();
    const refVideo: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-news') setUpdate((new Date()).getTime());
        })
    }, [])

    useEffect(() => {
        if (!news) return;

        const newNews = {
            ...news,
            ...{option: {image: !!arrImg.length, text: !!textGPT?.length, audio: isExistAudio, video: isExistVideo}}
        }
        setNews(newNews);

        const arrNewNews = [...arrNews];
        arrNewNews[news.index] = newNews;
        setArrNews(arrNewNews);

        (async () => {
            await updateDB({
                values: {option: JSON.stringify(newNews.option)},
                condition: {id: newNews.id}
            });
        })()

    }, [arrImg, textGPT, isExistAudio, isExistVideo]);

    useEffect(() => {
        writeChange(news, textGPT, listHostToData)
    }, [textGPT]);

    useEffect(() => {
        if (!news) return;

        if (currID === news.id) return;
        currID = news.id;
        setTextGPT('')
        getLocalSource(news);

        const {id, url, title, tags, text, dt, titleEn} = news;
        const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
        const src = `news\\${date}\\${name}\\`;
        refAudio.current.querySelector('source').src = src + 'speech.mp3';
        refAudio.current.load();
        refAudio.current.addEventListener('canplay', e => setIsExistAudio(true))

        refVideo.current.querySelector('source').src = src + 'news.mp4';
        refVideo.current.load();
        refVideo.current.addEventListener('canplay', e => setIsExistVideo(true))

    }, [news])

    useEffect(() => {
        getLocalSource(news);
    }, [update])

    async function onBuild() {
        //TODO:
        setStateNewsBuild(1);
        try {
            const {id, url, title, tags, text, dt, titleEn} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const from = listHostToData[(new URL(url)).host].from;
            await axios.post(glob.host + 'build-an-news', {title: news.title, tags: news.tags, text: news.text, date, name, from});

            refVideo.current.querySelector('source').src = `/public/news/${date}/${name}/news.mp4?upd=` + new Date().getTime()
            refVideo.current.load()

            setStateNewsBuild(0);
        } catch (e) {
            setStateNewsBuild(2);
        }
        console.log()
    }

    async function toYASpeech(voice: string, speed: number) {
        setStateText2Speech(1);
        try {
            const {id, url, title, tags, text, dt, titleEn} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            await axios.post(glob.host + 'to-speech', {text: textGPT, date, name, voice, speed});
            refAudio.current.querySelector('source').src = `/public/news/${date}/${name}/speech.mp3?upd=` + new Date().getTime()
            refAudio.current.load()
            setStateText2Speech(0);
        } catch (e) {
            setStateText2Speech(2);
        }
    }

    const getLocalSource = async (news): Promise<void> => {
        try {
            // console.log(news)

            const {id, url, title, tags, text, dt, titleEn} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const {data: {arrImgUrls: arrSrc, textContent, isExistAudio, isExistVideo,}} =
                await axios.get(glob.host + 'local-data', {params: {name, date}});

            setTextGPT(textContent);
            setIsExistAudio(isExistAudio)
            setIsExistVideo(isExistVideo)
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))

            await updateImageSizes(arrSrc, setArrImg);
        } catch (e) {
            setArrImg([])
        }
    }

    async function onUpdateAnNews() {
        try {
            setStateUpdateAnNews(1)
            const {id, url, title, tags, text, dt, type} = news;
            const short = listHostToData[(new URL(url)).host].short;

            const {data} = await axios.post(glob.host + 'update-one-news-type', {typeNews: type, newsSrc: short, url})

            setStateUpdateAnNews(0)

        } catch (e) {
            console.log(e)
            setStateUpdateAnNews(2)
        }
    }

    async function onRemoveNews() {
        try {
            const {id, url, title, tags, text, dt, type} = news;
            await axios.post(glob.host + 'remove-news', {id})
        } catch (e) {
            console.log(e)
            setStateUpdateAnNews(2)
        }
    }

    return (
        <div className="options d-flex flex-column h-100 notranslate"
            // @ts-ignore
             upd={update}>
            <div className="d-flex flex-row">
            <textarea className="options__title d-flex flex-row flex-stretch input-text border rounded mb-1 p-2" value={news?.title || ''}
                      onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
                <Button hidden={true} variant="secondary btn-sm mb-1 notranslate" onClick={onUpdateAnNews}>Обновить</Button>
                <Button hidden={true} variant="secondary btn-sm mb-1 notranslate" onClick={onRemoveNews}>X</Button>
            </div>
            <Tabs defaultActiveKey="original" className="mb-1">
                <Tab eventKey="original" title="Оригинал" style={{flex: 1}} className="">
                    <textarea className="news-text flex-stretch no-resize border rounded mb-1 p-2" value={news?.text || ''}
                              onChange={({target}) => setNews(was => ({...was, text: target.value}))}/>
                </Tab>
                <Tab eventKey="handled" title="GPT" style={{flex: 1}}>
                    <GPT news={news} textGPT={textGPT} setTextGPT={setTextGPT} listHostToData={listHostToData}/>
                </Tab>
                <Tab eventKey="images" title="Картинки" style={{flex: 1}}>
                    <Images news={news} setNews={setNews} arrImg={arrImg} setArrImg={setArrImg} listHostToData={listHostToData}/>
                </Tab>
                <Tab eventKey="audio" title="Озвучка">
                    <div className="flex-stretch" style={{flex: 1}}>
                        <div className="d-flex flex-column w-100">
                            <ButtonGroup className="notranslate">
                                <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                               onClick={() => toYASpeech('alena', 1.4)}>Алёна</ButtonSpinner>
                                <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                               onClick={() => toYASpeech('marina', 1.5)}>Марина</ButtonSpinner>
                                <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                               onClick={() => toYASpeech('omazh', 1.5)}>Омаж</ButtonSpinner>
                                <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                               onClick={() => toYASpeech('filipp', 1.4)}>Филипп</ButtonSpinner>
                            </ButtonGroup>
                            <audio controls ref={refAudio} className="w-100">
                                <source type="audio/mpeg"/>
                            </audio>
                        </div>
                    </div>
                </Tab>
                <Tab eventKey="build" title="Сборка">
                    <div className="flex-stretch" style={{flex: 1}}>
                        <div className="d-flex flex-column w-100">
                            <ButtonSpinner className="btn-secondary btn-sm mb-1 notranslate" state={stateNewsBuild} onClick={onBuild}>
                                Собрать
                            </ButtonSpinner>
                            <video controls ref={refVideo} className="w-100">
                                <source type="video/mp4"/>
                                Ваш браузер не поддерживает тег video.
                            </video>
                        </div>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
}