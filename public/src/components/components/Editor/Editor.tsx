import React, {useEffect, useRef, useState} from 'react';
import 'photoswipe/style.css';
import axios from "axios";
import {toGPT, updateMedia, updateNewsDB, updateTaskDB} from "../../utils.ts";
import './style.css'
import {Button, ButtonGroup, Tab, Tabs} from "react-bootstrap";
import {eventBus} from "../../../utils.ts";
import ButtonSpinner from "../Auxiliary/ButtonSpinner/ButtonSpinner";
import Text from "./components/Text/Text.tsx";
import Images from "./components/Images/Images";
import glob from "../../../global.ts";
import global from "../../../global.ts";
import 'tui-image-editor/dist/tui-image-editor.css';
import Dialog from "../Auxiliary/Dialog/Dialog.tsx";
import Telegram from "./components/Telegram/Telegram.tsx";
import {ButtonSeries} from "../Auxiliary/ButtonSeries/ButtonSeries.tsx";
import {VideoPrepare} from "./components/Video/Video.tsx";

let currID;

export default function Editor({news, setNews, listHostToData, typeServiceGPT}) {

    const [stateAudioRemove, setStateAudioRemove] = useState(0)
    const [stateUpdateAnNews, setStateUpdateAnNews] = useState(0)
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [textGPT, setTextGPT] = useState('')
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [update, setUpdate] = useState((new Date()).getTime())


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

    }, [news])


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
                    <Text typeServiceGPT={typeServiceGPT} news={news} setNews={setNews}/>
                </Tab>
                <Tab eventKey="images" title="Изображения" style={{flex: 1}}>
                    <Images news={news} setNews={setNews} maxImage={news.audioDur} typeServiceGPT={typeServiceGPT}/>
                </Tab>
                <Tab eventKey="build" title="Видео">
                    <VideoPrepare news={news} setNews={setNews} typeServiceGPT={typeServiceGPT}/>
                </Tab>
                <Tab eventKey="test" title="Телеграм" style={{flex: 1}}>
                    <Telegram setNews={setNews} news={news} typeServiceGPT={typeServiceGPT}/>
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
        </div>
    );
};