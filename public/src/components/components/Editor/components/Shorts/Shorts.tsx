import React, {useEffect, useRef, useState} from "react";
import global from "../../../../../global.ts";
import glob from "../../../../../global.ts";
import {toGPT, updateMedia, updateNewsDB} from "../../../../utils.ts";
import {ButtonSeries} from "../../../Auxiliary/Groups/ButtonSeries/ButtonSeries.tsx";
import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner.tsx";
import axios from "axios";
import {ButtonGroup} from "react-bootstrap";

let currID;

const promptGeneralDesc = 'Сделай из этой новости краткий сжатый текст до 20 слов максимально короткими словами для новостного видео';

function ShortsPrepare({typeServiceGPT, news, setNews}) {
    const refShorts: React.MutableRefObject<HTMLVideoElement> = useRef();

    useEffect(() => {
        if (!news) return;

        updateNewsDB(news);

        if (currID === news.id) return;
        currID = news.id;

        (async () => {
            await updateMedia(refShorts.current, news.pathSrc + `/shorts.mp4`, setNews, 'videoDur')
        })()

    }, [news])


    async function onGPT(name, prompt) {

        try {
            const {data: folderPath} = await axios.get(glob.hostAPI + 'dir', {params: {id: news.id}});

            const text = await toGPT(typeServiceGPT, prompt, news.text);

            const str = folderPath + '\n' + news.title + '\n\n\n' + global.links + '\n\n' + text;
            setNews(news => ({...news, titleShorts: str}));
            return text ? 0 : 2
        } catch (e) {
            console.log(e)
            return 2;
        }
    }

    let onChangeData = (obj, stateForUpd) => {
        // setNews({...news, ...obj})
        updateNewsDB({id: news.id, ...obj});
        stateForUpd(Object.values(obj)[0]);
    };

    async function onBuildShorts() {
        try {
            const {data: {respID}} = await axios.post(glob.hostAPI + 'build-shorts', {id: news.id});

            if (currID !== +respID) return; //TODO: переделать
            await updateMedia(refShorts.current, news.pathSrc + `/shorts.mp4`, setNews, 'videoDur')
        } catch (e) {
            return 2;
        }
        return 0
    }

    return <div className="d-flex flex-column w-100">
        <div className="d-flex flex-row align-self-end gap-1 mb-2">
            <div className="align-content-center">Выполнено</div>
            <input className="rounded border text-end " type="range"
                   value={news?.secPerFrame}
                   min={1.5} max={4}
                   step={0.1}
                   onChange={({target}) => setNews(was => ({...was, secPerFrame: +target.value}))}
                   title="Длительность кадра"/>
            <span className="p-1 text-center text-nowrap me-3"
                  style={{width: '3em'}}>{news.secPerFrame} сек </span>
            <ButtonGroup>
                <ButtonSeries arrParam={[['✨Подготовить', promptGeneralDesc]]} onAction={onGPT} style={{width: '8em'}}
                              className="align-self-end"/>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" onAction={onBuildShorts}>🎞️Собрать shorts</ButtonSpinner>
                <ButtonSpinner onAction={() => navigator.clipboard.writeText(news.titleShorts)}
                               className="btn-secondary btn-sm">📄Скопировать</ButtonSpinner>
            </ButtonGroup>
        </div>

        <textarea className="form-control me-1 operation__prompt rounded border mb-1"
                  value={news.titleShorts ?? ''}
                  style={{height: '15em'}}
                  onChange={e => setNews({...news, titleShorts: e.target.value})}/>

        <div className="d-flex justify-content-center flex-stretch">
            <video controls ref={refShorts} style={{maxHeight: '20%', margin: '2em', padding: '1em'}}>
                <source type="video/mp4"/>
                Ваш браузер не поддерживает тег video.
            </video>
        </div>
    </div>
}

export {ShortsPrepare}