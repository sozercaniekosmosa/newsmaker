import React, {useEffect, useRef, useState} from 'react';
import 'photoswipe/style.css';
import Gallery from "./components/Gallery/Gallery";
import axios from "axios";
import {getNameAndDate, updateDB, updateImageSizes} from "../../utils.ts";
import './style.css'
import {ButtonGroup, Image, Tab, Tabs} from "react-bootstrap";
import {debounce, getSelelected, insertAt} from "../../../utils.ts";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import GPT from "./components/GPT/GPT";
import globals from "globals";
import Images from "./components/Images/Images";

let currID;

const writeChange: (news, text, host) => void = debounce(async (news, text, host) => {
    if (!news) return;
    const {id, url, dt} = news;
    const {date, name} = getNameAndDate(dt, url, id);
    await axios.post(globals.host + 'save', {path: `news\\${date}\\${name}\\news.txt`, data: text});
}, 1000)

export default function Editor(
    {arrNews, setArrNews, news, setNews}) {

    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [arrImg, setArrImg] = useState([])
    const [textGPT, setTextGPT] = useState('')
    const [isExistAudio, setIsExistAudio] = useState(false)
    const [isExistVideo, setIsExistVideo] = useState(false)
    const [stateNewsBuild, setStateNewsBuild] = useState(0)

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();
    const refVideo: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        if (!news) return;

        const newNews = {
            ...news,
            ...{option: {image: !!arrImg.length, text: !!textGPT?.length, audio: isExistAudio}}
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

    }, [arrImg, textGPT, isExistAudio]);

    useEffect(() => {
        writeChange(news, textGPT, globals.host)
    }, [textGPT]);

    useEffect(() => {
        if (!news) return;
        if (currID === news.id) return;
        currID = news.id;
        setTextGPT('')
        getLocalSource(news);

        const {id, url, title, tags, text, dt} = news;
        const {date, name} = getNameAndDate(dt, url, id);
        const src = `news\\${date}\\${name}\\`;
        refAudio.current.querySelector('source').src = src + 'speech.mp3';
        refAudio.current.load();
        refAudio.current.addEventListener('canplay', e => setIsExistAudio(true))

        refVideo.current.querySelector('source').src = src + 'news.mp4';
        refVideo.current.load();
        refVideo.current.addEventListener('canplay', e => setIsExistVideo(true))

    }, [news])

    async function onBuild() {
        //TODO:
        setStateNewsBuild(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            await axios.post(globals.host + 'build', {title: news.title, tags: news.tags, text: news.text, date, name});

            refVideo.current.querySelector('source').src = `/public/news/${date}/${name}/news.mp4?upd=` + new Date().getTime()
            refVideo.current.load()

            setStateNewsBuild(0);
        } catch (e) {
            setStateNewsBuild(2);
        }
        console.log()
    }

    async function toSpeech() {
        setStateText2Speech(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            await axios.post(globals.host + 'to-speech', {text: textGPT, date, name});
            refAudio.current.querySelector('source').src = `/public/news/${date}/${name}/speech.mp3?upd=` + new Date().getTime()
            refAudio.current.load()
            setStateText2Speech(0);
        } catch (e) {
            setStateText2Speech(2);
        }
    }

    const getLocalSource = async (news): Promise<void> => {
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            const {
                data: {
                    arrImgUrls: arrSrc,
                    textContent,
                    isExistAudio
                }
            } = await axios.get(globals.host + 'local-data', {params: {name, date}});
            setTextGPT(textContent);
            setIsExistAudio(isExistAudio)
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))
            await updateImageSizes(arrSrc, setArrImg);
        } catch (e) {
            setArrImg([])
        }
    }

    return (
        <div className="options d-flex flex-column h-100 notranslate">
            <textarea className="options__title d-flex flex-row input-text" value={news?.title || ''}
                      onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
            <Tabs defaultActiveKey="original" className="mb-3">
                <Tab eventKey="original" title="Оригинал" style={{flex: 1}} className="">
                    <textarea className="flex-stretch options__text" value={news?.text || ''}
                              onChange={({target}) => setNews(was => ({...was, text: target.value}))}/>
                </Tab>
                <Tab eventKey="handled" title="GPT" style={{flex: 1}}>
                    <GPT news={news} textGPT={textGPT} setTextGPT={setTextGPT}/>
                </Tab>
                <Tab eventKey="images" title="Картинки">
                    <Images news={news} setNews={setNews} arrImg={arrImg} setArrImg={setArrImg}/>
                </Tab>
                <Tab eventKey="audio" title="Озвучка">
                    <div className="flex-stretch" style={{flex: 1}}>
                        <div className="d-flex flex-column w-100">
                            <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                           onClick={toSpeech}>Озвучить</ButtonSpinner>
                            <audio controls ref={refAudio} className="w-100">
                                <source type="audio/mpeg"/>
                            </audio>
                        </div>
                    </div>
                </Tab>
                <Tab eventKey="build" title="Сборка">
                    <div className="flex-stretch" style={{flex: 1}}>
                        <div className="d-flex flex-column w-100">
                            <ButtonSpinner className="btn-secondary btn-sm mb-1 notranslate" state={stateNewsBuild}
                                           onClick={onBuild}>Собрать</ButtonSpinner>
                            <video controls ref={refVideo} className="w-100">
                                <source type="video/mpeg"/>
                            </video>
                        </div>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
}