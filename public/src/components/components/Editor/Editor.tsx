import React, {useEffect, useRef, useState} from 'react';
import 'photoswipe/style.css';
import axios from "axios";
import {toGPT, updateNewsDB, updateTaskDB} from "../../utils.ts";
import './style.css'
import {Button, ButtonGroup, Tab, Tabs} from "react-bootstrap";
import {eventBus} from "../../../utils.ts";
import ButtonSpinner from "../Auxiliary/ButtonSpinner/ButtonSpinner";
import GPT from "./components/GPT/GPT";
import Images from "./components/Images/Images";
import glob from "../../../global.ts";
import global from "../../../global.ts";
import 'tui-image-editor/dist/tui-image-editor.css';
import Dialog from "../Auxiliary/Dialog/Dialog.tsx";
import Telegram from "./components/Telegram/Telegram.tsx";

let currID;

const promptGeneralDesc = 'Сделай из этой новости краткий сжатый текст до 15 слов максимально короткими словами для новостного видео';

const checkResourceAvailability = async (url: string) => {
    try {
        return await axios.get(glob.hostAPI + 'exist-resource', {params: {url: url.replace('5173/', '3000/public/public/')}});
    } catch (error) {
        console.log('Ошибка загрузки видео:', error);
        return false;
    }
};

async function updateMedia(node, src, setNews, propName) {
    const res = await checkResourceAvailability(glob.host + src)

    if (res) {
        node.addEventListener('loadedmetadata', e => setNews((now: {}) => ({
            ...now,
            [propName]: (e.target as HTMLAudioElement).duration
        })));
        node.querySelector('source').src = glob.host + src + '?upd=' + new Date().getTime();
        node.load()
    } else {
        setNews((now: {}) => ({...now, [propName]: 0}))
        node.querySelector('source').src = '';
        node.load()
    }
}

export default function Editor({news, setNews, listHostToData}) {

    const [stateAudioRemove, setStateAudioRemove] = useState(0)
    const [stateUpdateAnNews, setStateUpdateAnNews] = useState(0)
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [textGPT, setTextGPT] = useState('')
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [update, setUpdate] = useState((new Date()).getTime())
    const [speedDelta, setSpeedDelta] = useState(-.2);
    const [audioDur, setAudioDuration] = useState(0);
    const [showModalRemoveAnAudio, setShowModalRemoveAnAudio] = useState(false);
    const [titleGPT, setTitleGPT] = useState('')

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();
    const refVideo: React.MutableRefObject<HTMLVideoElement> = useRef();
    const refShorts: React.MutableRefObject<HTMLVideoElement> = useRef();

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

        if (currID === news.id) return;
        currID = news.id;

        (async () => {
            await updateMedia(refVideo.current, news.pathSrc + `/news.mp4`, setNews, 'videoDur')
            await updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur')
            await updateMedia(refShorts.current, news.pathSrc + `/shorts.mp4`, setNews, 'videoDur')
        })()

    }, [news])

    async function onGPT(type, prompt) {

        const text = await toGPT(type, prompt, news.text)

        const str = news.title + '\n\n' + global.links + '\n\n' + text;
        setTitleGPT(str)
        updateTaskDB({title: str});
        return text ? 0 : 2
    }

    let onChangeData = (obj, stateForUpd) => {
        updateNewsDB({...obj});
        stateForUpd(Object.values(obj)[0]);
    };

    async function onBuildVideo() {
        try {
            const {data: {respID}} = await axios.post(glob.hostAPI + 'build-an-news', {id: news.id});

            if (currID !== +respID) return; //TODO: переделать
            await updateMedia(refVideo.current, news.pathSrc + `/news.mp4`, setNews, 'videoDur')
        } catch (e) {
            return 2;
        }
        return 0
    }

    async function onBuildShorts() {
        try {
            const {data: {respID}} = await axios.post(glob.hostAPI + 'build-shorts', {id: news.id});

            if (currID !== +respID) return; //TODO: переделать
            await updateMedia(refShorts.current, news.pathSrc + `/shorts.mp4`, setNews, 'videoDur')
        } catch (e) {
            return 2;
        }
        return 0
    }

    async function toYASpeech(voice: string, speed: number) {
        setStateText2Speech(1);
        try {
            await axios.post(glob.hostAPI + 'to-speech', {
                id: news.id,
                text: glob.selectedText ?? news.textGPT,
                voice,
                speed
            });
            glob.selectedText = '';
            await updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur')

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

            const {data} = await axios.post(glob.hostAPI + 'update-one-news-type', {
                typeNews: type,
                newsSrc: short,
                url
            })

            setStateUpdateAnNews(0)

        } catch (e) {
            console.log(e)
            setStateUpdateAnNews(2)
        }
    }

    async function onRemoveNews() {
        try {
            const {id, url, title, tags, text, dt, type} = news;
            await axios.post(glob.hostAPI + 'remove-news', {id})
        } catch (e) {
            console.log(e)
            setStateUpdateAnNews(2)
        }
    }

    const onRemoveAudio = async () => {

        try {
            setStateAudioRemove(1);

            await axios.get(global.hostAPI + 'remove-file', {params: {id: news.id, filename: 'speech.mp3'}});
            await axios.get(global.hostAPI + 'remove-file', {params: {id: news.id, filename: 'out.mp3'}});

            setStateAudioRemove(0);
        } catch (e) {
            console.log(e)
            setStateAudioRemove(2);
        } finally {
            setNews(now => ({...now, audioDur: 0}));
            await updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur')
        }
    }

    const listYA2SpeechButton = [
        {name: 'Алёна', clb: toYASpeech, arrParam: ['alena', 1.4 + speedDelta]},
        {name: 'Марина', clb: toYASpeech, arrParam: ['marina', 1.5 + speedDelta]},
        {name: 'Омаж', clb: toYASpeech, arrParam: ['omazh', 1.5 + speedDelta]},
        {name: 'Филипп', clb: toYASpeech, arrParam: ['filipp', 1.4 + speedDelta]}
    ];
    let listGPTPromptButton = [
        {name: 'ya-GPT', clb: onGPT, arrParam: ['yandex', promptGeneralDesc]},
        {name: 'arli-GPT', clb: onGPT, arrParam: ['arli', promptGeneralDesc]},
        {name: 'mistral-GPT', clb: onGPT, arrParam: ['mistral', promptGeneralDesc]},
    ];

    return (
        !news ? '' : <div className="options d-flex flex-column h-100 notranslate"
            // @ts-ignore
                          upd={update}>
            <Button hidden={false} variant="secondary btn-sm mb-1 notranslate"
                    onClick={() => axios.post(glob.hostAPI + 'open-dir', {id: news.id})}>Открыть</Button>

            <Button hidden={true} variant="secondary btn-sm mb-1 notranslate" onClick={onUpdateAnNews}>Обновить</Button>
            <Button hidden={true} variant="secondary btn-sm mb-1 notranslate" onClick={onRemoveNews}>X</Button>
            <div className="d-flex flex-row">
            <textarea className="options__title d-flex flex-row flex-stretch input-text border rounded mb-1 p-2"
                      value={news?.title || ''}
                      onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
            </div>
            <Tabs defaultActiveKey="original" className="mb-1">
                <Tab eventKey="original" title="Текст" style={{flex: 1}} className="">
                    <div className="d-flex flex-column flex-stretch w-100" style={{position: 'relative'}}>
                        <div className="w-100" style={{position: 'relative'}}>
                            <textarea className="news-text border rounded mb-1 p-2 w-100" value={news?.text || ''}
                                      onChange={({target}) => setNews(was => ({...was, text: target.value}))}
                                      style={{height: '15em'}}/>
                            <div style={{
                                position: 'absolute',
                                bottom: '10px',
                                left: '6px',
                                opacity: '0.7',
                                backgroundColor: '#ffffff'
                            }}>
                                Слов: {(news?.text.match(/ /g) || []).length}</div>
                        </div>
                        <hr/>
                        <GPT news={news} setNews={setNews}/>
                        <hr/>
                        <div className="d-flex flex-column w-100">
                            <div className="d-flex flex-row">
                                <ButtonGroup className="notranslate flex-stretch">
                                    {listYA2SpeechButton.map(({name, clb, arrParam}, idi) => (
                                        <ButtonSpinner className="btn-secondary btn-sm mb-2" key={idi} onAction={() => {
                                            /*@ts-ignore*/
                                            return clb(...arrParam);
                                        }}>{name}</ButtonSpinner>))}
                                </ButtonGroup>
                                <input className="rounded border text-end mb-2 ms-1" type="range" value={speedDelta}
                                       min={-1} max={1}
                                       step={0.1} onChange={({target}) => setSpeedDelta(+target.value)}
                                       title="Скорость"/>
                                <span className="p-1 text-center" style={{width: '3em'}}>{speedDelta}</span>
                            </div>
                            <div className="d-flex mb-1">
                                <audio controls ref={refAudio} className="w-100" style={{height: '2em'}}
                                       onDurationChange={(e) => {
                                           setAudioDuration(~~(e.target as HTMLAudioElement).duration)
                                       }}>
                                    <source type="audio/mpeg"/>
                                </audio>
                                <Button variant="secondary btn-sm p-0 ms-1" style={{height: '27px', width: '27px', flex: 'none'}}
                                        onClick={() => setShowModalRemoveAnAudio(true)}>X</Button>
                            </div>
                        </div>
                    </div>
                </Tab>
                <Tab eventKey="images" title="Изображения" style={{flex: 1}}>
                    <Images news={news} setNews={setNews} maxImage={audioDur}/>
                </Tab>
                <Tab eventKey="build" title="Видео">
                    <div className="flex-stretch" style={{flex: 1}}>
                        <div className="d-flex flex-column w-100">
                            <div className="d-flex flex-row align-self-end gap-1">
                                <input className="rounded border text-end mb-2 " type="checkbox"
                                       checked={news?.done}
                                       min={1.5} max={4}
                                       step={0.1}
                                       onChange={({target}) => setNews(was => ({...was, done: target.checked}))}
                                       title="Завершено"/>
                                <input className="rounded border text-end mb-2 " type="range"
                                       value={news?.secPerFrame}
                                       min={1.5} max={4}
                                       step={0.1}
                                       onChange={({target}) => setNews(was => ({...was, secPerFrame: +target.value}))}
                                       title="Длительность кадра"/>
                                <span className="p-1 text-center text-nowrap me-3"
                                      style={{width: '3em'}}>{news.secPerFrame} сек </span>
                                <ButtonSpinner className="btn-secondary btn-sm mb-1 notranslate" onAction={onBuildVideo}>
                                    Собрать видео
                                </ButtonSpinner>
                                <ButtonSpinner className="btn-secondary btn-sm mb-1 notranslate" onAction={onBuildShorts}>
                                    Собрать shorts
                                </ButtonSpinner>
                            </div>
                            <div className="d-flex flex-row justify-content-center gap-1">
                                <video controls ref={refVideo} style={{height: '20em'}}>
                                    <source type="video/mp4"/>
                                    Ваш браузер не поддерживает тег video.
                                </video>
                                <video controls ref={refShorts} style={{height: '20em'}}>
                                    <source type="video/mp4"/>
                                    Ваш браузер не поддерживает тег video.
                                </video>
                            </div>
                            <textarea className="form-control me-1 operation__prompt rounded border mb-1" value={titleGPT}
                                      style={{height: '15em'}}
                                      onChange={e => onChangeData({title: e.target.value}, setTitleGPT)}/>
                            <ButtonGroup>
                                {listGPTPromptButton.map(({name, clb, arrParam}, idi) => (
                                    <ButtonSpinner variant="secondary btn-sm" key={idi} onAction={() => {
                                        // @ts-ignore
                                        return clb(...arrParam);
                                    }}>{name}</ButtonSpinner>))}
                            </ButtonGroup>
                        </div>
                    </div>
                </Tab>
                <Tab eventKey="test" title="Телеграм" style={{flex: 1}}>
                    <Telegram setNews={setNews} news={news}></Telegram>
                </Tab>
                {/*<Tab eventKey="test" title="Тест">*/}
                {/*    <ImageEditor pathImage="/news\25.01.22\DZ-NatKitUch-8uy0JhC9m\4fSIutQR0.png"*/}
                {/*                 onSaveImage={(nodeCanvas, path) => {*/}
                {/*                     nodeCanvas.toBlob(async (blob) => {*/}
                {/*                         const formData = new FormData();*/}
                {/*                         formData.append('image', blob);*/}
                {/*                         formData.append('path', path);*/}

                {/*                         await axios.post(global.hostAPI + 'save-image', formData, {headers: {'Content-Type': 'multipart/form-data'}})*/}
                {/*                     }, "image/png");*/}
                {/*                     // console.log(path)*/}
                {/*                 }}/>*/}
                {/*</Tab>*/}
            </Tabs>
            <Dialog title="Удалить эелемент" message="Уверены?" show={showModalRemoveAnAudio}
                    setShow={setShowModalRemoveAnAudio}
                    onConfirm={onRemoveAudio} props={{className: 'modal-sm'}}/>
        </div>
    );
};