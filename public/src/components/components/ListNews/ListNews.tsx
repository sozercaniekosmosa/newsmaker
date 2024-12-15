import React from 'react';
import 'photoswipe/style.css';
import {formatDateTime} from "../../../utils";
import './style.css'

export default function ListNews({arrTypes, filterTags, arrNews, typeNews, listHostToIcon, onShowNews, setFilterTags}) {

    function onSelectTag({target}) {
        if (!target?.dataset?.tag) return
        console.log(target.dataset.tag)
        setFilterTags(target.dataset.tag)
    }

    const toTranslate = arrTypes.reduce((acc,val)=>({...acc,...val}),{})

    function onClickNews({target}) {
        if (!target?.dataset?.index) return
        // console.log(target.dataset.index)
        let title_ru = target.querySelector('.title-ru').textContent;
        let text_ru = target.querySelector('.text-ru').textContent
        let tags_ru = target.querySelector('.tags-ru').textContent
        text_ru = text_ru.replaceAll(/%@%/g, '\n\n')
        const {id, url, title, tags, text, dt} = arrNews[target.dataset.index]
        target.parentNode.parentNode.querySelector('.selected')?.classList.remove('selected')
        target.parentNode.classList.add('selected')

        onShowNews({id, url, title: title_ru, tags: tags_ru, text: text_ru, dt, tagsEn: tags});
    }

    return (
        <div className="scroll-wrapper">
            <div className="n-list">
                {arrNews.map(({id, url, title, tags, text, dt, type}, idx) => {

                    if (filterTags && !tags.includes(filterTags)) return '';
                    if (typeNews && !type.includes(typeNews)) return '';
                    const icon = listHostToIcon[(new URL(url)).host];
                    return (
                        <div className="n-list__item" key={idx}>
                            <div data-index={idx} data-id={id} onClick={onClickNews}>
                                <div className="text-ru">{text.replaceAll(/\n/g, '%@%')}</div>
                                <div className="tags-ru">{tags}</div>
                                <img src={icon} className="n-list__icon" alt={icon}/>
                                <span>{formatDateTime(new Date(dt), 'dd.mm.yy hh:MM')}</span>&nbsp;
                                <a href={url || ''} target="_blank">ссылка</a>&nbsp;
                                <span>{toTranslate[type]}</span>
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