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
import Dialog from "../Dialog/Dialog.tsx";
import 'tui-image-editor/dist/tui-image-editor.css';
import DraggableList from "./components/DraggableList/DraggableList.tsx";

let currID, _news;

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
    const [arrImgAssign, setArrImgAssign] = useState([])
    const [textGPT, setTextGPT] = useState('')
    const [isExistAudio, setIsExistAudio] = useState(false)
    const [isExistVideo, setIsExistVideo] = useState(false)
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [update, setUpdate] = useState((new Date()).getTime())
    const [addText, setAddText] = useState('');
    const [speedDelta, setSpeedDelta] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [addItem, setAddItem] = useState(null);

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();
    const refVideo: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-news') {
                setUpdate((new Date()).getTime());
            }
        })

        // eventBus.addEventListener('build-all-news', () => {
        //     setNews(null)
        // })

    }, [])

    useEffect(() => {
        if (!news) return;

        const newNews = {
            ...news,
            ...{
                option: {
                    image: arrImgAssign,
                    text: !!textGPT?.length,
                    audio: audioDuration,
                    video: isExistVideo,
                    done: !!news?.option?.done
                }
            }
        }
        setNews(newNews);

        const arrNewNews = [...arrNews];
        arrNewNews[news.index] = newNews;
        setArrNews(arrNewNews);

        (() => updateDB({values: {option: JSON.stringify(newNews.option)}, condition: {id: newNews.id}}))()

    }, [arrImg, textGPT, isExistAudio, isExistVideo, arrImgAssign, audioDuration]);

    useEffect(() => {
        writeChange(news, textGPT, listHostToData)
    }, [textGPT]);

    useEffect(() => {
        if (!news) return;

        if (currID === news.id) return;
        currID = news.id;
        setTextGPT('')
        setArrImgAssign(news?.option?.image ?? [])
        getLocalSource(news);

        const {id, url, title, tags, text, dt, titleEn} = news;
        const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
        const src = `news\\${date}\\${name}\\`;
        refAudio.current.querySelector('source').src = src + 'speech.mp3';
        refAudio.current.load();
        refAudio.current.addEventListener('canplay', e => setIsExistAudio(true))

        refVideo.current.querySelector('source').src = src + 'news.mp4?upd=' + new Date().getTime();
        refVideo.current.load();
        refVideo.current.addEventListener('canplay', e => setIsExistVideo(true))

        const _addText = text.match(/^\*.*/m)?.[0] ?? '';
        setAddText(_addText)

        setArrImg([])
    }, [news])

    useEffect(() => {
        getLocalSource(news);
    }, [update])

    async function onBuild() {
        setStateNewsBuild(1);
        try {
            const {id, url, title, tags, text, dt, titleEn, srcName, option} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const from = listHostToData[(new URL(url)).host].from;

            // a=[1,2,3,4,5]
            // b=9/1.5
            // c=Array(Math.ceil(b/a.length)).fill(a).flat().splice(0,b)

            let SecPerFrame = 1.5; //сек на кадр
            const arr = option.image;
            const dur = option.audio / SecPerFrame
            const arrSrcImg = Array(Math.ceil(dur / arr.length)).fill(arr).flat().splice(0, dur);


            const {data: {respID}} = await axios.post(glob.host + 'build-an-news', {
                title: news.title,
                tags: news.tags,
                text: news.text,
                date,
                name,
                from: from ?? srcName,
                addText,
                id,
                arrSrcImg: arrSrcImg.map(url => (new URL(url)).pathname)
            });
            setStateNewsBuild(0);

            if (currID !== +respID) return; //TODO: переделать

            refVideo.current.querySelector('source').src = `/public/news/${date}/${name}/news.mp4?upd=` + new Date().getTime()
            refVideo.current.load()

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
        // if (!news) return;
        // if (_news) return;
        // debugger
        try {
            // console.log(news)

            const {id, url, title, tags, text, dt, titleEn} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const {data: {arrImgUrls: arrSrc, textContent, isExistAudio, isExistVideo,}} =
                await axios.get(glob.host + 'local-data', {params: {name, date}});

            setTextGPT(textContent);
            setIsExistAudio(isExistAudio)
            setIsExistVideo(isExistVideo)
            setArrImg(arrSrc.map(src => {
                src += '?d=' + (new Date()).getTime()
                return {src, width: undefined, height: undefined};
            }))

            await updateImageSizes(arrSrc, setArrImg);
        } catch (e) {
            // setArrImg([])
        }

        _news = news
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


    const initialItems = [
        'news\\25.01.10\\DZ-KomUdaKat-8ZRY7RrwO\\qZAlBNrRx.png',
        'news\\25.01.10\\DZ-NewStaVto-zwyhoGurj\\97nrmfhru.png',
        'news\\25.01.10\\DZ-NewStaVto-zwyhoGurj\\shEKY74qE.png',
        'news\\25.01.10\\DZ-TelZheRod-cgecVFyy6\\A6ykTKtjx.png',
        'news\\25.01.09\\DZ-SovTraUol-3aZcvwshS\\cd9GrJvjg.png',
        'news\\25.01.09\\DZ-EkoPreRos-eQzOFv4wc\\924AVYD2w.png',
    ];

    return (
        !news ? '' : <div className="options d-flex flex-column h-100 notranslate"
            // @ts-ignore
                          upd={update}>
            <div className="d-flex flex-row">
            <textarea className="options__title d-flex flex-row flex-stretch input-text border rounded mb-1 p-2" value={news?.title || ''}
                      onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
                <Button hidden={true} variant="secondary btn-sm mb-1 notranslate" onClick={onUpdateAnNews}>Обновить</Button>
                <Button hidden={true} variant="secondary btn-sm mb-1 notranslate" onClick={onRemoveNews}>X</Button>
            </div>
            <Tabs defaultActiveKey="original" className="mb-1">
                <Tab eventKey="original" title="Текст" style={{flex: 1}} className="">
                    <div className="d-flex flex-column flex-stretch w-100" style={{position: 'relative'}}>
                        <div className="w-100" style={{position: 'relative'}}>
                            <textarea className="news-text border rounded mb-1 p-2 w-100" value={news?.text || ''}
                                      onChange={({target}) => setNews(was => ({...was, text: target.value}))}
                                      style={{height: '15em'}}/>
                            <div style={{position: 'absolute', bottom: '10px', left: '6px', opacity: .5}}>
                                Слов: {(news?.text.match(/ /g) || []).length}</div>
                        </div>
                        <hr/>
                        <GPT news={news} textGPT={textGPT} setTextGPT={setTextGPT} listHostToData={listHostToData}
                             setAddText={setAddText} addText={addText}/>
                        <hr/>
                        <div className="d-flex flex-column w-100">
                            <div className="d-flex flex-row">
                                <ButtonGroup className="notranslate flex-stretch">
                                    <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                                   onClick={() => toYASpeech('alena', 1.4 + speedDelta)}>Алёна</ButtonSpinner>
                                    <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                                   onClick={() => toYASpeech('marina', 1.5 + speedDelta)}>Марина</ButtonSpinner>
                                    <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                                   onClick={() => toYASpeech('omazh', 1.5 + speedDelta)}>Омаж</ButtonSpinner>
                                    <ButtonSpinner className="btn-secondary btn-sm mb-2" state={stateText2Speech}
                                                   onClick={() => toYASpeech('filipp', 1.4 + speedDelta)}>Филипп</ButtonSpinner>
                                </ButtonGroup>
                                <input className="rounded border text-end mb-2 ms-1" type="range" value={speedDelta} min={-1} max={1}
                                       step={0.1} onChange={({target}) => setSpeedDelta(+target.value)} title="Скорость"/>
                                <span className="p-1 text-center" style={{width: '3em'}}>{speedDelta}</span>
                            </div>
                            <audio controls ref={refAudio} className="w-100 mb-2" style={{height: '2em'}} onDurationChange={(e) => {
                                setAudioDuration(~~(e.target as HTMLAudioElement).duration)
                            }}>
                                <source type="audio/mpeg"/>
                            </audio>
                        </div>
                    </div>
                </Tab>
                <Tab eventKey="images" title="Изображения" style={{flex: 1}}>
                    <Images news={news} setNews={setNews}
                            arrImg={arrImg} setArrImg={setArrImg}
                            arrImgAssign={arrImgAssign} setArrImgAssign={setArrImgAssign}
                            listHostToData={listHostToData}
                            maxImage={audioDuration}/>
                </Tab>
                <Tab eventKey="build" title="Видео">
                    <div className="flex-stretch" style={{flex: 1}}>
                        <div className="d-flex flex-column w-100">
                            <ButtonSpinner className="btn-secondary btn-sm mb-1 notranslate" state={stateNewsBuild}
                                           onClick={onBuild}>
                                Собрать видео
                            </ButtonSpinner>
                            <video controls ref={refVideo} className="w-100">
                                <source type="video/mp4"/>
                                Ваш браузер не поддерживает тег video.
                            </video>
                        </div>
                    </div>
                </Tab>
                {/*<Tab eventKey="test" title="Тест">*/}
                {/*    <button onClick={() => setAddItem((new Date()).getTime())}>Add Item</button>*/}
                {/*</Tab>*/}
            </Tabs>
        </div>
    );
}