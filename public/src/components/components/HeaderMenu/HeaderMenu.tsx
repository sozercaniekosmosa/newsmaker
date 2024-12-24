import React, {useEffect, useState} from 'react';
import 'photoswipe/style.css';
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import {Button, ButtonGroup} from "react-bootstrap";
import {addDay, eventBus, formatDateTime} from "../../../utils.ts";
import {getData} from "../../utils.ts";
import axios from "axios";
import './style.css'
import glob from "../../../global.ts";
import iconTG from "../../../assets/tg.svg";
import iconRT from "../../../assets/rt.png";

export default function HeaderMenu({arrButtonSelect, setArrNews, filterTags, typeNews, setTypeNews, setFilterTags}) {

    const [listPolitics, listPoliticsRU, listScience, listCulture, listSport] = arrButtonSelect as Object[];
    const [dtFrom, setDtFrom] = useState(formatDateTime(addDay(0, new Date()), 'yyyy-mm-dd'))
    const [dtTo, setDtTo] = useState(formatDateTime(new Date(), 'yyyy-mm-dd'))
    const [stateNewsTGUpdate, setStateNewsTGUpdate] = useState(0)
    const [stateNewsRTUpdate, setStateNewsRTUpdate] = useState(0)

    useEffect(() => {
        eventBus.addEventListener('connect-to-srv', () => {
            (async (): Promise<void> => setArrNews(await getData(dtFrom, dtTo)))();
        });
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-list-news')  (async (): Promise<void> => setArrNews(await getData(dtFrom, dtTo)))();
        })
    }, []);

    useEffect(() => {
        (async (): Promise<void> => setArrNews(await getData(dtFrom, dtTo)))();
    }, [dtFrom, dtTo])

    function onResetSelectedTag() {
        setFilterTags('')
    }

    function onSelectSrcNews({target, currentTarget}) {
        const {dataset: {type}} = target;
        currentTarget.querySelector('.header-type-flt .selected-news-type')?.classList.remove('selected-news-type')
        target.classList.add('selected-news-type')
        setTypeNews(type)
        console.log(type)
    }

    async function onUpdateAllNews(newsSrc) {
        const listSetStateNews = {'TG': setStateNewsTGUpdate, 'RT': setStateNewsRTUpdate}

        listSetStateNews[newsSrc](1)
        try {
            await axios.post(glob.host + 'update-news-type', {typeNews, newsSrc})
            const from = formatDateTime(addDay(0, new Date()), 'yyyy-mm-dd');
            let to = formatDateTime(new Date(), 'yyyy-mm-dd');

            if (from + to != dtFrom + dtTo) {
                setDtFrom(from)
                setDtTo(to)
            } else {
                setArrNews(await getData(dtFrom, dtTo))
            }

            listSetStateNews[newsSrc](0)

        } catch (e) {
            console.log(e)
            listSetStateNews[newsSrc](2)
        }

    }

    return <header>
        <div className="header-type-flt" onClick={onSelectSrcNews}>
            <Button variant="secondary btn-sm notranslate selected-news-type" data-type={''}>Все</Button>
            <ButtonGroup>
                {Object.entries(listPolitics).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listPoliticsRU).map(([key, val], index) => <Button key={index} variant="secondary btn-sm notranslate"
                                                                                   data-type={key}>{val}</Button>)}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listScience).map(([key, val], index) => <Button key={index} variant="secondary btn-sm notranslate"
                                                                                data-type={key}>{val}</Button>)}</ButtonGroup>
            <ButtonGroup>
                {Object.entries(listCulture).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listSport).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
        </div>
        <div className="header-control-flt d-flex flex-row notranslate">
            <ButtonSpinner className="btn-secondary btn-sm notranslate d-flex align-items-center" state={stateNewsTGUpdate}
                           onClick={() => onUpdateAllNews('TG')}>
                <img src={iconTG} className="news-icon" alt={iconTG}/>&nbsp;<span>Обновить</span>
            </ButtonSpinner>
            <ButtonSpinner className="btn-secondary btn-sm notranslate d-flex align-items-center" state={stateNewsRTUpdate}
                           onClick={() => onUpdateAllNews('RT')}>
                <img src={iconRT} className="news-icon" alt={iconRT}/>&nbsp;<span>Обновить</span>
            </ButtonSpinner>
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}} value={dtFrom}
                   onChange={e => setDtFrom(e.target.value)}/>
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}} value={dtTo}
                   onChange={e => setDtTo(e.target.value)}/>
            <div className="selected-filters" onClick={onResetSelectedTag}>{filterTags ? '#' + filterTags : ''}</div>
        </div>
    </header>;
}