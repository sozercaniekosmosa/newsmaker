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
            if (type === 'update-news') setUpdate((new Date()).getTime());
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

        setNews({
            id, url, title: title_ru, tags: tags_ru, text: text_ru, titleEn: title,
            dt, tagsEn: tags, option, type, index: target.dataset.index, srcName
        });
    }

    return (
        <div className="scroll-wrapper">
            <div className="n-list ms-1 mb-1" // @ts-ignore
                 upd={update}>
                {arrNews.map(({id, url, title, tags, text, dt, type, option}, idx) => {

                    // if (donePre == false && (option && (option.image || option.text || option.audio || option.video))) {
                    // } else return '';
                    if (donePre && (!option || !(option.image || option.text || option.audio || option.video))) return '';
                    if (doneTasks == false && option?.done == true) return '';
                    if (filterTags && !tags.includes(filterTags)) return '';
                    if (typeNews && type != typeNews) return '';
                    const icon = listHostToData[(new URL(url)).host].icon;

                    return (
                        <div className={"n-list__item ps-1" + ((id == currID) ? ' selected' : '')} key={idx}
                             style={option?.done ? {backgroundColor: 'rgba(151,151,184,0.73)'} : {}}>
                            <div data-index={idx} data-id={id} onClick={onClickNews}>
                                {/*<div className="text-ru">{text.replaceAll(/\n/g, '%@%')}</div>*/}
                                <div className="text-ru">{text}</div>
                                <div className="tags-ru">{tags}</div>
                                <img src={icon} className="news-icon me-1" alt={icon}/>
                                <span>{formatDateTime(new Date(dt), 'dd.mm.yy hh:MM')}</span>&nbsp;
                                <a href={url || ''} target="_blank">ссылка</a>&nbsp;
                                <span>{toTranslate[type]}</span>
                                <span className="notranslate">{option?.image?.length ? '🖼️' : ''}</span>
                                <span className="notranslate">{option?.text ? '📝' : ''}</span>
                                <span className="notranslate">{option?.audio > 0 ? '🎵' : ''}</span>
                                <span className="notranslate">{option?.video ? '🎥' : ''}</span>
                                <div className="n-list__title title-ru">{title}</div>
                            </div>
                            {/*<div className="n-list__tags notranslate" onClick={onSelectTag}>*/}
                            {/*    {tags.replaceAll(/\s?,\s?/g, ',').split(',').map((it, i) => <a key={i} data-tag={it}> #{it}</a>)}*/}
                            {/*</div><div className="n-list__tags notranslate" onClick={onSelectTag}>*/}
                            {/*    {tags.replaceAll(/\s?,\s?/g, ',').split(',').map((it, i) => <a key={i} data-tag={it}> #{it}</a>)}*/}
                            {/*</div>*/}
                        </div>);
                })}
            </div>
        </div>
    );
}