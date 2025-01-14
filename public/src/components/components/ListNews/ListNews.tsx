import 'photoswipe/style.css';
import {eventBus, formatDateTime} from "../../../utils";
import './style.css'
import global from "../../../global.ts";
import {useEffect, useState} from "react";

let currID;
export default function ListNews(
    {arrTypes, filterTags, arrNews, typeNews, listHostToData, setNews, setFilterTags, doneTasks, donePre}) {

    const [update, setUpdate] = useState((new Date()).getTime())

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type}) => {
            // if (type === 'update-news') setUpdate((new Date()).getTime());
        })

        // eventBus.addEventListener('build-all-news', () => {
        //     document.querySelector('.n-list .selected')?.classList.remove('selected')
        // })

    }, [])


    function onSelectTag({target}) {
        if (!target?.dataset?.tag) return
        console.log(target.dataset.tag)
        setFilterTags(target.dataset.tag)
    }

    const toTranslate = arrTypes.reduce((acc, val) => ({...acc, ...val}), {})

    function onClickNews({target}) {
        if (!target?.dataset?.index) return

        global.selectedText = undefined;

        let title_ru = target.querySelector('.title-ru').textContent;
        let text_ru = target.querySelector('.text-ru').textContent
        let tags_ru = target.querySelector('.tags-ru').textContent

        const {id, url, title, tags, text, dt, option, type, srcName} = arrNews[target.dataset.index]
        target.parentNode.parentNode.querySelector('.selected')?.classList.remove('selected')
        target.parentNode.classList.add('selected')

        currID = id;

        // setNews({
        //     id, url, title: title_ru, tags: tags_ru, text: text_ru, titleEn: title,
        //     dt, tagsEn: tags, option, type, index: target.dataset.index, srcName
        // });
        setNews(arrNews[target.dataset.index])
    }

    return (
        <div className="scroll-wrapper">
            <div className="n-list ms-1 mb-1" // @ts-ignore
                 upd={update}>
                {arrNews.map(({arrImg, date, done, from, id, audioDur, videoDur, tags, text, textGPT, title, type, url}, idx) => {

                    if (donePre && (!(videoDur.image || textGPT || audioDur || videoDur))) return '';
                    if (doneTasks == false && done == true) return '';
                    if (filterTags && !tags.includes(filterTags)) return '';
                    if (typeNews && type != typeNews) return '';
                    const icon = listHostToData[(new URL(url)).host];

                    return (
                        <div className={"n-list__item ps-1" + ((id == currID) ? ' selected' : '')} key={idx}
                             style={done ? {backgroundColor: 'rgba(151,151,184,0.73)'} : {}}>
                            <div data-index={idx} data-id={id} onClick={onClickNews}>
                                <div className="text-ru">{text}</div>
                                <div className="tags-ru">{tags}</div>
                                <img src={icon} className="news-icon me-1" alt={icon}/>
                                <span>{formatDateTime(new Date(date), 'dd.mm.yy hh:MM')}</span>&nbsp;
                                <a href={url || ''} target="_blank">ссылка</a>&nbsp;
                                <span>{toTranslate[type]}</span>
                                <div className="d-flex flex-row">
                                    <span className="notranslate">{arrImg?.length ? '🖼️' : ''}</span>
                                    <span className="notranslate">{textGPT ? '📝' : ''}</span>
                                    <span className="notranslate">{audioDur > 0 ? '🎵' : ''}</span>
                                    <span className="notranslate">{videoDur > 0 ? '🎥' : ''}</span>
                                </div>
                                <div className="n-list__title title-ru">{title}</div>
                            </div>
                        </div>);
                })}
            </div>
        </div>
    );
}