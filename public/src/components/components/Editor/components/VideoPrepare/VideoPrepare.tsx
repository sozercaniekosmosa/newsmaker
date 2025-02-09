import React, {useEffect, useRef, useState} from "react";
import global from "../../../../../global.ts";
import {toGPT, updateMedia, updateNewsDB, updateTaskDB} from "../../../../utils.ts";
import {ButtonSeries, TOnAction, TArrParam} from "../../../Auxiliary/Groups/ButtonSeries/ButtonSeries.tsx";
import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner.tsx";
import axios from "axios";
import glob from "../../../../../global.ts";

let currID;

const promptGeneralDesc = 'Сделай из этой новости краткий сжатый текст до 15 слов максимально короткими словами для новостного видео';

function VideoPrepare({typeServiceGPT, news, setNews}) {

    const [titleGPT, setTitleGPT] = useState('')

    const refVideo: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        if (!news) return;

        updateNewsDB(news);

        if (currID === news.id) return;
        currID = news.id;

        (async () => {
            await updateMedia(refVideo.current, news.pathSrc + `/news.mp4`, setNews, 'videoDur')
        })()

    }, [news])


    async function onGPT(prompt) {

        const text = await toGPT(typeServiceGPT, prompt, news.text)

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

    return <div className="flex-stretch" style={{flex: 1}}>
        <div className="d-flex flex-column w-100">
            <div className="d-flex flex-row align-self-end gap-1 mb-2">
                <div className="align-content-center">Выполнено</div>
                <input className="rounded border text-end " type="checkbox" checked={news?.done} min={1.5} max={4} step={0.1}
                       title="Завершено"
                       onChange={({target}) => setNews(was => ({...was, done: target.checked}))}/>
                <input className="rounded border text-end " type="range" value={news?.secPerFrame} min={1.5} max={4} step={0.1}
                       title="Длительность кадра"
                       onChange={({target}) => setNews(was => ({...was, secPerFrame: +target.value}))}/>
                <span className="p-1 text-center text-nowrap me-3"
                      style={{width: '3em'}}>{news.secPerFrame} сек </span>
                <ButtonSpinner className="btn-secondary btn-sm mb-1 notranslate" onAction={onBuildVideo}>🎞️Собрать видео</ButtonSpinner>
            </div>
            <div className="d-flex flex-row justify-content-center">
                <video controls ref={refVideo} style={{width: '50%'}}>
                    <source type="video/mp4"/>
                    Ваш браузер не поддерживает тег video.
                </video>
            </div>
        </div>
    </div>
}

export {VideoPrepare}