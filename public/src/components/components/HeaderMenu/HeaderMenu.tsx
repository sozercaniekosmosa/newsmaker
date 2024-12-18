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

export default function HeaderMenu({
                                       arrButtonSelect,
                                       setArrNews,
                                       filterTags,
                                       typeNews, setTypeNews,
                                       setFilterTags
                                   }) {

    const [listPolitics, listScience, listCulture, listSport] = arrButtonSelect as Object[];
    const [dtFrom, setDtFrom] = useState(formatDateTime(addDay(-1, new Date()), 'yyyy-mm-dd'))
    const [dtTo, setDtTo] = useState(formatDateTime(new Date(), 'yyyy-mm-dd'))
    const [stateNewsUpdate, setStateNewsUpdate] = useState(0)

    useEffect(() => {
        eventBus.addEventListener('connect-to-srv', () => {
            (async (): Promise<void> => setArrNews(await getData(glob.host, dtFrom, dtTo)))();
        });

    }, []);

    useEffect(() => {
        (async (): Promise<void> => setArrNews(await getData(glob.host, dtFrom, dtTo)))();
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

    async function onUpdateAllNews() {
        setStateNewsUpdate(1)
        try {
            await axios.post(glob.host + 'update-news-type', {typeNews})
            const from = formatDateTime(addDay(-1, new Date()), 'yyyy-mm-dd');
            let to = formatDateTime(new Date(), 'yyyy-mm-dd');

            if (from + to != dtFrom + dtTo) {
                setDtFrom(from)
                setDtTo(to)
            } else {
                setArrNews(await getData(glob.host, dtFrom, dtTo))
            }

            setStateNewsUpdate(0)

        } catch (e) {
            console.log(e)
            setStateNewsUpdate(2)
        }

    }

    return <header>
        <div className="header-type-flt" onClick={onSelectSrcNews}>
            <ButtonGroup>
                {Object.entries(listPolitics).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listScience).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
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
            <ButtonSpinner className="btn-secondary btn-sm notranslate d-flex align-items-center" state={stateNewsUpdate}
                           onClick={onUpdateAllNews}>
                <img src={iconTG} className="news-icon" alt={iconTG}/>&nbsp;<span>Обновить</span>
            </ButtonSpinner>
            <ButtonSpinner className="btn-secondary btn-sm notranslate d-flex align-items-center" state={stateNewsUpdate}
                           onClick={onUpdateAllNews}>
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