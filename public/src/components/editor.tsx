import React, {useEffect, useRef, useState} from 'react'
import './style.css'
import {Pane, ResizablePanes} from "resizable-panes-react";
import axios from "axios";
import {addDay, eventBus, formatDateTime, getSelelected, insertAt, toShortString} from "../utils";
import iconTG from "../assets/tg.svg";
import ButtonSpinner from "./ButtonSpinner/ButtonSpinner";
import {Button, ButtonGroup} from "react-bootstrap";
import ProgressBar from './ProgressBar/ProgressBar';
import LightGallery from 'lightgallery/react';
import lgZoom from 'lightgallery/plugins/zoom';
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/fonts/lg.woff2';
import Gallery from "./Gallery/Gallery";
import HeaderMenu from "./HeaderMenu/HeaderMenu";
import ListNews from "./ListNews/ListNews";
import News from "./News/News";
import Operation from "./Operation/Operation";

const HOST = 'http://localhost:3000/api/v1/';
const listHostToIcon = {'www.theguardian.com': iconTG}

const listPolitics = {
    world: "Мир", europeNews: "Европа", usa: "США", americas: "Америка",
    asia: "Азия", australia: "Австралия", africa: "Африка", middleeast: "Ближний восток",
}
const listScience = {science: "Наука", technology: "Технологии",}
const listSport = {business: "Бизнес", football: "Футбол", cycling: "Велоспорт", formulaone: "F1",}
const listCulture = {
    books: "Книги",
    tvRadio: "ТВ-Радио",
    art: "АРТ",
    film: "Фильмы",
    games: "Игры",
    classical: "Классика",
    stage: "Сцена"
};
let arrTypes = [listPolitics, listScience, listCulture, listSport];

let getData = async (from, to) => {
    const {data} = await axios.get(HOST + 'news', {
        params: {
            from: (new Date(from)).getTime(),
            to: (new Date(to)).getTime()
        }
    });
    return data;
}

function getSourcePrefix(str) {
    if (str.includes('theguardian')) return 'tg'
}

function getNameAndDate(dt, url, id) {
    const date = formatDateTime(new Date(dt), 'yy.mm.dd');
    const name = getSourcePrefix(url) + '-' + toShortString(id);
    return {date, name};
}

const updateImageSizes = async (arrImg, setArrImg) => {
    const updatedImages = await Promise.all(
        arrImg.map(async (src) => {
            const img = new Image();
            img.src = src;
            await img.decode();
            return {src, width: img.width, height: img.height,};
        })
    );
    setArrImg(updatedImages);
};

function Editor() {
    const [dtFrom, setDtFrom] = useState(formatDateTime(addDay(-1, new Date()), 'yyyy-mm-dd'))
    const [dtTo, setDtTo] = useState(formatDateTime(new Date(), 'yyyy-mm-dd'))
    const [arrNews, setArrNews] = useState([])
    const [news, setNews] = useState(null)
    const [arrImg, setArrImg] = useState([])
    const [prompt, setPrompt] = useState('Выдели основные мысли и сократи текст до 30 слов')
    const [filterTags, setFilterTags] = useState(null)
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [stateImageLoad, setStateImageLoad] = useState(0)
    const [stateNewsUpdate, setStateNewsUpdate] = useState(0)
    const [stateLoadGPT, setstateLoadGPT] = useState(0)
    const [typeNews, setTypeNews] = useState('')
    const [progress, setProgress] = useState(0)

    const refTags: React.MutableRefObject<HTMLTextAreaElement> = useRef();
    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type === 'progress') setProgress(data)
        });
    }, [])

    useEffect(() => {
        (async (): Promise<void> => setArrNews(await getData(dtFrom, dtTo)))();
    }, [dtFrom, dtTo])

    function onShowNews({target}) {
        if (!target?.dataset?.index) return
        // console.log(target.dataset.index)
        let title_ru = target.querySelector('.title-ru').textContent;
        let text_ru = target.querySelector('.text-ru').textContent
        let tags_ru = target.querySelector('.tags-ru').textContent
        text_ru = text_ru.replaceAll(/%@%/g, '\n\n')
        const {id, url, title, tags, text, dt} = arrNews[target.dataset.index]
        setNews({id, url, title: title_ru, tags: tags_ru, text: text_ru, dt, tagsEn: tags})
        target.parentNode.parentNode.querySelector('.selected')?.classList.remove('selected')
        target.parentNode.classList.add('selected')
        refAudio.current.querySelector('source').src = ''
        refAudio.current.load()

        getLocalImage(arrNews[target.dataset.index]);
    }

    function onSelectTag({target}) {
        if (!target?.dataset?.tag) return
        console.log(target.dataset.tag)
        setFilterTags(target.dataset.tag)
    }

    function onResetSelectedTag() {
        setFilterTags('')
    }

    async function onUpdateAllNews() {
        setStateNewsUpdate(1)
        try {
            await axios.post(HOST + 'update', {typeNews})
            const from = formatDateTime(addDay(-1, new Date()), 'yyyy-mm-dd');
            let to = formatDateTime(new Date(), 'yyyy-mm-dd');

            if (from + to != dtFrom + dtTo) {
                setDtFrom(from)
                setDtTo(to)
            } else {
                setArrNews(await getData(dtFrom, dtTo))
            }

            setStateNewsUpdate(0)

        } catch (e) {
            console.log(e)
            setStateNewsUpdate(2)
        }

    }

    async function gpt({target}) {
        setstateLoadGPT(1)
        try {
            let nodeNewsTextContainer = document.querySelector('.options__text');

            const {selectedText, startPos, endPos} = getSelelected(nodeNewsTextContainer)
            const textContent = selectedText ?? nodeNewsTextContainer.textContent;

            const {data} = await axios.post(HOST + 'gpt', {text: textContent, prompt});
            let text = data.alternatives.map(({message: {text}}) => text).join('\n')

            if (selectedText) {
                text = insertAt(nodeNewsTextContainer.textContent, '\n==>\n' + text + '\n<==\n', endPos)
                console.log(selectedText)
            }

            setNews(was => ({...was, text}))
            setstateLoadGPT(0)
        } catch (e) {
            console.log(e)
            setstateLoadGPT(2)
        }
    }

    const getLocalImage = async (news): Promise<void> => {
        // setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            const {data: arrSrc} = await axios.get(HOST + 'loc-images', {params: {name, date}});
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))
            await updateImageSizes(arrSrc, setArrImg);
            // setStateImageLoad(0)
        } catch (e) {
            // console.log(e)
            // setStateImageLoad(2)
            setArrImg([])
        }
    }

    async function requestImages() {
        setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const prompt = refTags.current.textContent
            const {date, name} = getNameAndDate(dt, url, id);
            const {data: arrSrc} = await axios.get(HOST + 'images', {params: {prompt, name, max: 10, date}});
            setArrImg(arrSrc.map(src => ({src, width: undefined, height: undefined,})))
            await updateImageSizes(arrSrc, setArrImg);
            // console.log(arrSrc)
            setStateImageLoad(0)
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
        }
    }

    async function build() {
        //TODO:
        setStateNewsBuild(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            await axios.post(HOST + 'build', {title: news.title, tags: news.tags, text: news.text, date, name});
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
            await axios.post(HOST + 'tospeech', {text: news.text, date, name});
            refAudio.current.querySelector('source').src = `/public/news/${date}/${name}/speech.mp3?upd=` + new Date().getTime()
            refAudio.current.load()
            setStateText2Speech(0);
        } catch (e) {
            setStateText2Speech(2);
        }
    }

    function onSelectSrcNews({target, currentTarget}) {
        const {dataset: {type}} = target;
        currentTarget.querySelector('.type-filters .selected-news-type')?.classList.remove('selected-news-type')
        target.classList.add('selected-news-type')
        setTypeNews(type)
        console.log(type)
    }

    return (
        <div className="editor d-flex flex-column h-100">
            {progress >= 0 && <ProgressBar progress={progress}/>}
            <HeaderMenu
                onSelectSrcNews={onSelectSrcNews}
                arrButtonSelect={arrTypes}
                stateNewsUpdate={stateNewsUpdate}
                onUpdateAllNews={onUpdateAllNews} dtFrom={dtFrom} setDtFrom={setDtFrom} setDtTo={setDtTo}
                onResetSelectedTag={onResetSelectedTag} dtTo={dtTo} filterTags={filterTags}
            />
            <ResizablePanes vertical uniqueId="uid1" className="no-scroll" resizerSize={3}>
                <Pane id="P0" size={4}>
                    <ListNews
                        arrNews={arrNews} arrTypes={arrTypes}
                        onSelectTag={onSelectTag} filterTags={filterTags}
                        onShowNews={onShowNews}
                        typeNews={typeNews}
                        listHostToIcon={listHostToIcon}
                    />
                </Pane>
                <Pane id="P1" size={9}>
                    <News news={news} setNews={setNews} refTags={refTags}/>
                </Pane>
                <Pane id="P2" size={4}>
                    <Operation
                        onBuild={build} stateNewsBuild={stateNewsBuild}
                        onGPT={gpt} prompt={prompt} setPrompt={setPrompt} stateLoadGPT={stateLoadGPT}
                        toSpeech={toSpeech} refAudio={refAudio} stateLoadText2Speech={stateText2Speech}
                        arrImg={arrImg} requestImages={requestImages} stateImageLoad={stateImageLoad}
                    />
                </Pane>
            </ResizablePanes>
        </div>
    )
}

export default Editor
