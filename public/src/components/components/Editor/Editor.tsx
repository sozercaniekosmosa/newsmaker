import React, {useEffect, useRef, useState} from 'react';
import 'photoswipe/style.css';
import axios from "axios";
import {updateNewsDB} from "../../utils.ts";
import './style.css'
import {Button, ButtonGroup, Tab, Tabs} from "react-bootstrap";
import {eventBus} from "../../../utils.ts";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import GPT from "./components/GPT/GPT";
import Images from "./components/Images/Images";
import glob from "../../../global.ts";
import 'tui-image-editor/dist/tui-image-editor.css';

let currID;

function updateMedia(node, src, setNews, propName) {
    setNews((now: {}) => ({...now, [propName]: 0}))
    node.addEventListener('loadedmetadata', (e) => {
        setNews((now: {}) => ({...now, [propName]: (e.target as HTMLAudioElement).duration}));
    })
    node.addEventListener('error', () => {
        setNews((now: {}) => ({...now, [propName]: 0}))
    })
    node.querySelector('source').src = src + '?upd=' + new Date().getTime();
    node.load()
}

const getLocalImage = async (id, setArrImg): Promise<void> => {
    try {
        const {data: arrSrc} = await axios.get(glob.host + 'local-data', {params: {id}});
        setArrImg(arrSrc.map((src: string) => ({src: src + '?d=' + (new Date()).getTime(), width: 1920, height: 1080})))
    } catch (e) {
        // setArrImg([])
    }
}

export default function Editor({news, setNews, listHostToData}) {

    const [stateUpdateAnNews, setStateUpdateAnNews] = useState(0)
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [arrImg, setArrImg] = useState([])
    const [textGPT, setTextGPT] = useState('')
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [update, setUpdate] = useState((new Date()).getTime())
    const [speedDelta, setSpeedDelta] = useState(0);
    const [audioDur, setAudioDuration] = useState(0);

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();
    const refVideo: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-news') {
                setUpdate((new Date()).getTime());
            }
        })
    }, [])

    useEffect(() => {
        updateNewsDB(news)
    }, [textGPT]);

    useEffect(() => {
        if (!news) return;

        updateNewsDB(news);
        (() => getLocalImage(news.id, setArrImg))();

        if (currID === news.id) return;
        currID = news.id;

        updateMedia(refVideo.current, news.pathSrc + `/news.mp4`, setNews, 'videoDur')
        updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur')

    }, [news])

    useEffect(() => {
        if(!news) return
        (() => getLocalImage(news.id, setArrImg))();
    }, [update])

    async function onBuild() {
        setStateNewsBuild(1);
        try {

            const secPerFrame = 1.5
            const {data: {respID}} = await axios.post(glob.host + 'build-an-news', {id: news.id, secPerFrame});
            setStateNewsBuild(0);

            if (currID !== +respID) return; //TODO: переделать
            updateMedia(refVideo.current, news.pathSrc + `/news.mp4`, setNews, 'videoDur')
            setStateNewsBuild(0);
        } catch (e) {
            setStateNewsBuild(2);
        }
        console.log()
    }

    async function toYASpeech(voice: string, speed: number) {
        setStateText2Speech(1);
        try {
            await axios.post(glob.host + 'to-speech', {id: news.id, text: news.textGPT, voice, speed});
            updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur');
            setStateText2Speech(0);
        } catch (e) {
            setStateText2Speech(2);
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
                    <Images news={news} setNews={setNews} arrImg={arrImg} setArrImg={setArrImg} maxImage={audioDur}/>
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