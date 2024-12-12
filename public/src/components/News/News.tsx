import React from 'react';
import 'photoswipe/style.css';
import {formatDateTime} from "../../utils";

export default function News({setNews, news, refTags}) {
    return (
        <div className="options d-flex flex-column h-100">
                        <textarea className="options__title d-flex flex-row input-text" value={news?.title || ''}
                                  onChange={({target}) => setNews(was => ({...was, title: target.value}))}/>
            <textarea className="options__tags d-flex flex-row" value={news?.tagsEn || ''} ref={refTags}
                      onChange={({target}) => setNews(was => ({...was, tagsEn: target.value}))}/>
            <div className="editor-text flex-stretch d-flex flex-column">
                            <textarea className="flex-stretch options__text" value={news?.text || ''}
                                      onChange={({target}) => setNews(was => ({...was, text: target.value}))}/>
            </div>
        </div>
    );
}