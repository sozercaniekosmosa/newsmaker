import React, {useEffect, useRef, useState} from 'react';
import 'photoswipe/style.css';
import Gallery from "./components/Gallery/Gallery";
import axios from "axios";
import {getData, updateTaskDB, updateImageSizes, updateNewsDB} from "../../utils.ts";
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
    const [textAdd, setAddText] = useState('');
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
        updateNewsDB(news)
    }, [textGPT]);

    useEffect(() => {
        if (!news) return;

        // console.log(news.textHadled)

        updateNewsDB(news)

        if (currID === news.id) return;
        currID = news.id;

        // setTextGPT('')
        // setArrImgAssign(news?.option?.image ?? [])
        getLocalSource(news);

        refAudio.current.querySelector('source').src = news.pathSrc + '/speech.mp3';
        refAudio.current.load();
        refAudio.current.addEventListener('canplay', e => setIsExistAudio(true))

        refVideo.current.querySelector('source').src = news.pathSrc + '/news.mp4?upd=' + new Date().getTime();
        refVideo.current.load();
        refVideo.current.addEventListener('canplay', e => setIsExistVideo(true))

        // const _addText = news.text.match(/^\*.*/m)?.[0] ?? '';
        // setAddText(_addText)

        // setArrImg([])
    }, [news])

    useEffect(() => {
        getLocalSource(news);
    }, [update])

    async function onBuild() {
        setStateNewsBuild(1);
        try {

            const secPerFrame = 1.5
            const {data: {respID}} = await axios.post(glob.host + 'build-an-news', {id: news.id, secPerFrame});
            setStateNewsBuild(0);

            if (currID !== +respID) return; //TODO: переделать

            refVideo.current.querySelector('source').src = news.pathSrc + `/news.mp4?upd=` + new Date().getTime()
            refVideo.current.load()

        } catch (e) {
            setStateNewsBuild(2);
        }
        console.log()
    }

    async function toYASpeech(voice: string, speed: number) {
        setStateText2Speech(1);
        try {
            await axios.post(glob.host + 'to-speech', {id: news.id, text: textGPT, voice, speed});
            refAudio.current.querySelector('source').src = news.pathSrc + `/speech.mp3?upd=` + new Date().getTime()
            refAudio.current.load()
            refAudio.current.addEventListener('loadedmetadata', () => setNews((now: {}) => ({...now, isExistAudio: true})))
            refAudio.current.addEventListener('error', setNews((now: {}) => ({...now, isExistAudio: false})))
            setStateText2Speech(0);
        } catch (e) {
            setStateText2Speech(2);
        }
    }

    const getLocalSource = async (news): Promise<void> => {
        try {

            const {data: {arrImgUrls: arrSrc, textContent, isExistAudio, isExistVideo,}} =
                await axios.get(glob.host + 'local-data', {params: {id: news.id}});

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
                        <GPT news={news} setNews={setNews}/>
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
                    <Images news={news} setNews={setNews} arrImg={arrImg} setArrImg={setArrImg} maxImage={audioDuration}/>
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