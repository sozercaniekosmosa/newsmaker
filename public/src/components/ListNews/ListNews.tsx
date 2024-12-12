import React from 'react';
import 'photoswipe/style.css';
import {formatDateTime} from "../../utils";

export default function ListNews({arrTypes, filterTags, arrNews, typeNews, listHostToIcon, onShowNews, onSelectTag}) {

    const toTranslate = arrTypes.reduce((acc,val)=>({...acc,...val}),{})

    return (
        <div className="scroll-wrapper">
            <div className="n-list">
                {arrNews.map(({id, url, title, tags, text, dt, type}, idx) => {

                    if (filterTags && !tags.includes(filterTags)) return '';
                    if (typeNews && !type.includes(typeNews)) return '';
                    const icon = listHostToIcon[(new URL(url)).host];
                    return (
                        <div className="n-list__item" key={idx}>
                            <div data-index={idx} data-id={id} onClick={onShowNews}>
                                <div className="text-ru">{text.replaceAll(/\n/g, '%@%')}</div>
                                <div className="tags-ru">{tags}</div>
                                <img src={icon} className="n-list__icon" alt={icon}/>
                                <span>{formatDateTime(new Date(dt), 'dd.mm.yy hh:MM')}</span>&nbsp;
                                <a href={url || ''} target="_blank">ссылка</a>&nbsp;
                                <span>{toTranslate[type]}</span>
                                <div className="n-list__title title-ru">{title}</div>
                            </div>
                            <div className="n-list__tags notranslate" onClick={onSelectTag}>
                                {tags.replaceAll(/\s?,\s?/g, ',').split(',').map((it, i) => <a key={i}
                                                                                               data-tag={it}> #{it}</a>)}
                            </div>
                        </div>);
                })}
            </div>
        </div>
    );
}