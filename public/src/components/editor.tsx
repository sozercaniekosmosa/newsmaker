import React, {useEffect, useRef, useState} from 'react'
import './style.css'
import {Pane, ResizablePanes} from "resizable-panes-react";
import axios from "axios";
import {addDay, formatDateTime, getSelelected, insertAt, toShortString} from "../utils";
import iconTG from "../assets/tg.svg";
import ButtonSpinner from "./Button-spinner";

const HOST = 'http://localhost:3000/api/v1/';

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

// const attr = (is, val) => () => is ? val : '';

function getNameAndDate(dt, url, id) {
    const date = formatDateTime(new Date(dt), 'yy.mm.dd');
    const name = getSourcePrefix(url) + '-' + toShortString(id);
    return {date, name};
}

function Editor() {
    const [dtFrom, setDtFrom] = useState(formatDateTime(addDay(-1, new Date()), 'yyyy-mm-dd'))
    const [dtTo, setDtTo] = useState(formatDateTime(new Date(), 'yyyy-mm-dd'))
    const [arrNews, setArrNews] = useState([])
    const [news, setNews] = useState(null)
    const [arrImg, setArrImg] = useState([])
    const [prompt, setPrompt] = useState('Выдели основные мысли и сократи текст до 30 слов')
    // const [prompt, setPrompt] = useState('Выдели основные мысли из статьи сделай в виде текста')
    // const [prompt, setPrompt] = useState('Упрости текст до 30 слов')
    const [filterTags, setFilterTags] = useState(null)
    const [filterSource, setFilterSource] = useState(null)
    const [arrHandledNews, setArrHandledNews] = useState([])
    const [stateText2Speech, setStateText2Speech] = useState(0)
    const [stateNewsBuild, setStateNewsBuild] = useState(0)
    const [stateImageLoad, setStateImageLoad] = useState(0)
    const [stateNewsUpdate, setStateNewsUpdate] = useState(0)
    const [stateNewsSimplify, setStateNewsSimplify] = useState(0)

    const refImg: React.MutableRefObject<HTMLImageElement> = useRef();
    const refTags: React.MutableRefObject<HTMLTextAreaElement> = useRef();
    const refAudio: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        (async (): Promise<void> => setArrNews(await getData(dtFrom, dtTo)))();
    }, [dtFrom, dtTo])


    const locImage = async (news): Promise<void> => {
        setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const {date, name} = getNameAndDate(dt, url, id);
            const {data: arrNames} = await axios.get(HOST + 'loc-images', {
                params: {name, date}
            });

            // refImg.current.innerHTML = '';
            setArrImg(arrNames);
            setStateImageLoad(0)
        } catch (e) {
            console.log(e)
            setStateImageLoad(2)
        }
    }

    function showNews({target}) {
        if (!target?.dataset?.index) return
        console.log(target.dataset.index)
        let title_ru = target.querySelector('.title-ru').textContent;
        let text_ru = target.querySelector('.text-ru').textContent
        let tags_ru = target.querySelector('.tags-ru').textContent
        text_ru = text_ru.replaceAll(/%@%/g, '\n\n')
        const {id, url, title, tags, text, dt} = arrNews[target.dataset.index]
        setNews({id, url, title: title_ru, tags: tags_ru, text: text_ru, dt, tagsEn: tags})
        target.parentNode.parentNode.querySelector('.selected')?.classList.remove('selected')
        target.parentNode.classList.add('selected')
        // refImg.current.innerHTML = ''
        refAudio.current.querySelector('source').src = ''
        refAudio.current.load()

        locImage(arrNews[target.dataset.index]);
    }

    function selectTag({target}) {
        if (!target?.dataset?.tag) return
        console.log(target.dataset.tag)
        setFilterTags(target.dataset.tag)
    }

    function resetSelectedTag() {
        setFilterTags('')
    }

    async function updateAllNews() {
        setStateNewsUpdate(1)
        try {
            let {data: numb} = await axios.post(HOST + 'update');
            if (numb > 0) {
                const from = formatDateTime(addDay(-1, new Date()), 'yyyy-mm-dd');
                let to = formatDateTime(new Date(), 'yyyy-mm-dd');

                if (from + to != dtFrom + dtTo) {
                    setDtFrom(from)
                    setDtTo(to)
                } else {
                    setArrNews(await getData(dtFrom, dtTo))
                }
            }

            setStateNewsUpdate(0)
        } catch (e) {
            console.log(e)
            setStateNewsUpdate(2)
        }

    }


    async function gpt({target}) {
        setStateNewsSimplify(1)
        try {

            const nodeMainContainer = target.closest('.options');
            let nodeNewsTextContainer = nodeMainContainer.querySelector('.options__text');

            const {selectedText, startPos, endPos} = getSelelected(nodeNewsTextContainer)
            const textContent = selectedText ?? nodeNewsTextContainer.textContent;

            const {data} = await axios.post(HOST + 'gpt', {text: textContent, prompt});
            let text = data.alternatives.map(({message: {text}}) => text).join('\n')

            if (selectedText) {
                text = insertAt(nodeNewsTextContainer.textContent, '\n==>\n' + text + '\n<==\n', endPos)
                console.log(selectedText)
            }

            setNews(was => ({...was, text}))
            setStateNewsSimplify(0)
        } catch (e) {
            console.log(e)
            setStateNewsSimplify(2)
        }
    }

    function addToHandled({target}) {
        const nodeMainContainer = target.closest('.options');
        const title = nodeMainContainer.querySelector('.options__title').textContent;
        const tags = nodeMainContainer.querySelector('.options__tags').textContent;
        const text = nodeMainContainer.querySelector('.options__text').textContent;
        setArrHandledNews((was) => [...was, {title, tags, text}])

        console.log(title, tags, text)
    }

    async function requestImages() {
        setStateImageLoad(1);
        try {
            const {id, url, title, tags, text, dt} = news;
            const prompt = refTags.current.textContent
            const {date, name} = getNameAndDate(dt, url, id);
            const {data: arrNames} = await axios.get(HOST + 'images', {
                params: {prompt, name, max: 10, date}
            });
            await setArrImg(arrNames);
            console.log(arrNames)
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

    return (
        <div className="editor d-flex flex-column h-100">
            <div className="control-filters d-flex flex-row notranslate">
                <ButtonSpinner className="btn-secondary btn-sm notranslate"
                               state={stateNewsUpdate} onClick={updateAllNews}>Обновить</ButtonSpinner>
                <input type="date" className="form-control" style={{width: '8em', height: '2em'}} value={dtFrom}
                       onChange={e => setDtFrom(e.target.value)}/>
                <input type="date" className="form-control" style={{width: '8em', height: '2em'}} value={dtTo}
                       onChange={e => setDtTo(e.target.value)}/>
                <button className="btn btn-secondary btn-sm d-flex align-items-center"><img src={iconTG}
                                                                                            className="n-list__icon"
                                                                                            alt={iconTG}/></button>
                <div className="selected-filters" onClick={resetSelectedTag}>{filterTags ? '#' + filterTags : ''}</div>
            </div>
            <ResizablePanes vertical uniqueId="uid1" className="no-scroll" resizerSize={3}>
                <Pane id="P0" size={4}>
                    <div className="scroll-wrapper">
                        <div className="n-list">
                            {arrNews.map(({id, url, title, tags, text, dt}, idx) => {

                                if (filterTags && !tags.includes(filterTags)) return '';

                                return (
                                    <div className="n-list__item" key={idx}>
                                        <div data-index={idx} data-id={id} onClick={showNews}>
                                            <div className="text-ru">{text.replaceAll(/\n/g, '%@%')}</div>
                                            <div className="tags-ru">{tags}</div>
                                            <img src={iconTG} className="n-list__icon" alt={iconTG}/>
                                            <span>{formatDateTime(new Date(dt), 'dd.mm.yy hh:MM')}</span>&nbsp;
                                            <a href={news?.url || ''} target="_blank">ссылка</a>
                                            <div className="n-list__title title-ru">{title}</div>
                                        </div>
                                        <div className="n-list__tags notranslate" onClick={selectTag}>
                                            {tags.replaceAll(/\s?,\s?/g, ',').split(',').map((it, i) => <a key={i} data-tag={it}> #{it}</a>)}
                                        </div>
                                    </div>);
                            })}
                        </div>
                    </div>
                </Pane>
                <Pane id="P1" size={9}>
                    <div className="options d-flex flex-column h-100">
                        <textarea className="options__title d-flex flex-row input-text" value={news?.title || ''}
                                  onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
                        <textarea className="options__tags d-flex flex-row" value={news?.tagsEn || ''} ref={refTags}
                                  onChange={({target}) => setNews(was => ({...was, tagsEn: target.value}))}/>
                        <div className="editor-text flex-stretch d-flex flex-column">
                            <div className="d-flex flex-row" style={{margin: '.3em 0', height: '2em'}}>
                                <input type="text" className="form-control me-1 options__prompt"
                                       style={{width: '40em', height: '2em'}}
                                       value={prompt}
                                       onChange={e => setPrompt(e.target.value)}/>
                                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateNewsSimplify}
                                               onClick={gpt}>Обработать GPT</ButtonSpinner>
                            </div>
                            <textarea className="flex-stretch options__text" value={news?.text || ''}
                                      onChange={({target}) => setNews(was => ({...was, text: target.value}))}/>
                        </div>
                        <div className="options__img">
                            {arrImg.map((path, idi) => <a key={idi} href={path} target="_blank"><img src={path}/></a>)}
                        </div>
                        <div className="options__control d-flex flex-row align-items-center">
                            <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateImageLoad}
                                           onClick={requestImages}>Изображение</ButtonSpinner>
                            <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateText2Speech}
                                           onClick={toSpeech}>Озвучить</ButtonSpinner>
                            <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateNewsBuild}
                                           onClick={build}>Собрать</ButtonSpinner>
                            <audio controls ref={refAudio}
                                   style={{height: '1em', display: 'flex', alignItems: 'center'}}>
                                <source type="audio/mpeg"/>
                            </audio>
                        </div>
                    </div>
                </Pane>
            </ResizablePanes>
        </div>
    )
}

export default Editor
