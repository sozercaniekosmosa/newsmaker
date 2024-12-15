import React, {useEffect, useRef, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner.tsx";
import ListTask from "./Components/ListTask/ListTask.tsx";
import {Button} from "react-bootstrap";
import {getNameAndDate, updateImageSizes} from "../../utils.ts";
import axios from "axios";
import {getSelelected, insertAt} from "../../../utils.ts";

export default function Tools({news, setArrImg, host, setNews, textGPT, setTextGPT}) {

    const [arrTaskList, setArrTaskList] = useState([{id: 0, title: 'aaa'}, {id: 0, title: 'bbb'}, {id: 0, title: 'ccc'}]);
    const [stateImageLoad, setStateImageLoad] = useState(0)
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [prompt, setPrompt] = useState('Выдели основные мысли и сократи текст до 30 слов')
    const [stateLoadGPT, setstateLoadGPT] = useState(0)

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();

    useEffect(() => {
        if (!news) return;
        const {id, url, title, tags, text, dt} = news;
        const {date, name} = getNameAndDate(dt, url, id);
        refAudio.current.querySelector('source').src = `news\\${date}\\${name}\\speech.mp3`
        refAudio.current.load()
    }, [news])

    async function onGPT({target}) {
        setstateLoadGPT(1)
        try {
            let nodeNewsTextContainer = document.querySelector('.options__text');

            const {selectedText, startPos, endPos} = getSelelected(nodeNewsTextContainer)
            const textContent = selectedText ?? nodeNewsTextContainer.textContent;

            const {data} = await axios.post(host + 'gpt', {text: textContent, prompt});
            let text = data.alternatives.map(({message: {text}}) => text).join('\n')

            if (selectedText) {
                text = insertAt(nodeNewsTextContainer.textContent, '\n==>\n' + text + '\n<==\n', endPos)
                console.log(selectedText)
            }

            setTextGPT(text)

            const {id, url, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            await axios.post(host + 'save', {path: `news\\${date}\\${name}\\news.txt`, data: news.text});

            setstateLoadGPT(0)
        } catch (e) {
            console.log(e)
            setstateLoadGPT(2)
        }
    }

    async function requestImages() {
        setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            // const prompt = refTags.current.textContent
            const prompt = news.tagsEn;
            const {date, name} = getNameAndDate(dt, url, id);
            const {data: arrSrc} = await axios.get(host + 'images', {params: {prompt, name, max: 10, date}});
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))
            await updateImageSizes(arrSrc, setArrImg);
            // console.log(arrSrc)
            setStateImageLoad(0)
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
        }
    }

    async function onBuild() {
        //TODO:
        setStateNewsBuild(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            await axios.post(host + 'build', {title: news.title, tags: news.tags, text: news.text, date, name});
            setStateNewsBuild(0);
        } catch (e) {
            setStateNewsBuild(2);
        }
        console.log()
    }

    async function toSpeech() {
        //TODO:
        setStateText2Speech(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            await axios.post(host + 'tospeech', {text: textGPT, date, name});
            refAudio.current.querySelector('source').src = `/public/news/${date}/${name}/speech.mp3?upd=` + new Date().getTime()
            refAudio.current.load()
            setStateText2Speech(0);
        } catch (e) {
            setStateText2Speech(2);
        }
    }

    return (
        <div className="operation d-flex flex-column h-100">

            <div className="d-flex flex-row">
                <textarea className="form-control me-1 operation__prompt" value={prompt} onChange={e => setPrompt(e.target.value)}/>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadGPT} onClick={onGPT}>GPT</ButtonSpinner>
            </div>

            <div className="d-flex flex-column">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateImageLoad} onClick={requestImages}>
                    Загрузить изображения
                </ButtonSpinner>
            </div>

            <div className="d-flex flex-column align-arrItem-center justify-content-between">
                <ListTask arrData={arrTaskList} onChangeData={arr => setArrTaskList(arr)}/>
                <Button variant="secondary btn-sm my-1"
                        onClick={() => !arrTaskList.find(({id}) => id === news.id) && setArrTaskList([...arrTaskList, news])}>
                    Добавить
                </Button>
            </div>

            <div className="d-flex flex-row align-arrItem-center justify-content-between">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateText2Speech}
                               onClick={toSpeech}>Озвучить</ButtonSpinner>
                <audio controls ref={refAudio} style={{height: '2em'}}>
                    <source type="audio/mpeg"/>
                </audio>
            </div>

            <div className="d-flex flex-column">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateNewsBuild}
                               onClick={onBuild}>Собрать</ButtonSpinner>
            </div>
        </div>
    );
}