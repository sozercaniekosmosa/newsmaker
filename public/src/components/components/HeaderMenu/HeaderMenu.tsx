import React, {useEffect, useState} from 'react';
import 'photoswipe/style.css';
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import {Button, ButtonGroup} from "react-bootstrap";
import {addDay, addHour, eventBus, formatDateTime} from "../../../utils.ts";
import {getData} from "../../utils.ts";
import axios from "axios";
import './style.css'
import glob from "../../../global.ts";
import iconDz from "../../../assets/dzen.ico";

async function getNewsData(dtFrom: string, dtTo: string, setArrNews, setArrFilter) {
    let arrNews = await getData(dtFrom, dtTo);
    const arrFlt = [...new Set(arrNews.map(({type}) => type))];
    setArrFilter(arrFlt);
    setArrNews(arrNews)
}

function ButtonsTypeList({list, arrFilter}) {
    return Object.entries(list).map(([key, val], index) => {
        return <Button key={index} variant={(arrFilter.includes(key) ? 'secondary' : 'outline-secondary') + ' btn-sm notranslate'}
            // @ts-ignore
                       data-type={key}>{val}</Button>;
    });
}


export default function HeaderMenu({
                                       arrButtonSelect, setArrNews, filterTags, typeNews, setTypeNews, setFilterTags, doneTasks, setDoneTasks,
                                       donePre, setDonePre
                                   }) {
    const dayFrom = 0;
// debugger
    const d = formatDateTime(new Date(), 'yyyy-mm-dd 00:00:00')
//     console.log(d)

    const [listGeneral, listPolitics, listPoliticsRU, listScience, listCulture, listSport] = arrButtonSelect as Object[];
    const [arrFilter, setArrFilter] = useState([])
    const [dtFrom, setDtFrom] = useState(formatDateTime(addDay(dayFrom, new Date(d)), 'yyyy-mm-dd hh:MM:ss'))
    const [dtTo, setDtTo] = useState(formatDateTime(new Date(), 'yyyy-mm-dd hh:MM:ss'))
    const [stateNewsTGUpdate, setStateNewsTGUpdate] = useState(0)
    const [stateNewsRTUpdate, setStateNewsRTUpdate] = useState(0)
    const [stateNewsDZUpdate, setStateNewsDZUpdate] = useState(0)

    useEffect(() => {
        eventBus.addEventListener('connect-to-srv', () => {
            (async (): Promise<void> => await getNewsData(dtFrom, dtTo, setArrNews, setArrFilter))();
        });
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-list-news') (async (): Promise<void> => await getNewsData(dtFrom, dtTo, setArrNews, setArrFilter))();
            if (type === 'update-news') (async (): Promise<void> => await getNewsData(dtFrom, dtTo, setArrNews, setArrFilter))();
        })
    }, []);

    useEffect(() => {
        (async (): Promise<void> => await getNewsData(dtFrom, dtTo, setArrNews, setArrFilter))();
    }, [dtFrom, dtTo])


    function onResetSelectedTag() {
        setFilterTags('')
    }

    function onSelectSrcNews({target, currentTarget}) {
        if (target === currentTarget) return;

        const {dataset: {type}} = target;
        currentTarget.querySelector('.header-type-flt .selected-news-type')?.classList.remove('selected-news-type')
        target.classList.add('selected-news-type')
        setTypeNews(type)
        console.log(type)
    }

    async function onUpdateAllNews(newsSrc) {
        const listSetStateNews = {'TG': setStateNewsTGUpdate, 'RT': setStateNewsRTUpdate, 'DZ': setStateNewsDZUpdate}

        listSetStateNews[newsSrc](1)
        try {
            await axios.post(glob.hostAPI + 'update-news-type', {typeNews, newsSrc})
            const from = formatDateTime(addDay(dayFrom, new Date()), 'yyyy-mm-dd');
            let to = formatDateTime(new Date(), 'yyyy-mm-dd');

            if (from + to != dtFrom + dtTo) {
                setDtFrom(from)
                setDtTo(to)
            } else {
                await getNewsData(dtFrom, dtTo, setArrNews, setArrFilter);
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
            <ButtonGroup><ButtonsTypeList arrFilter={arrFilter} list={listGeneral}/></ButtonGroup>
            <ButtonGroup><ButtonsTypeList arrFilter={arrFilter} list={listPolitics}/></ButtonGroup>
            <ButtonGroup><ButtonsTypeList arrFilter={arrFilter} list={listPoliticsRU}/></ButtonGroup>
            <ButtonGroup><ButtonsTypeList arrFilter={arrFilter} list={listScience}/></ButtonGroup>
            <ButtonGroup><ButtonsTypeList arrFilter={arrFilter} list={listCulture}/></ButtonGroup>
            <ButtonGroup><ButtonsTypeList arrFilter={arrFilter} list={listSport}/></ButtonGroup>
        </div>
        <div className="header-control-flt d-flex flex-row notranslate">
            <ButtonSpinner className="btn-secondary btn-sm notranslate d-flex align-items-center" state={stateNewsDZUpdate}
                           onClick={() => onUpdateAllNews('DZ')}>
                <img src={iconDz} className="news-icon" alt={iconDz}/>
            </ButtonSpinner>

            <input type="date" className="form-control" style={{width: '8em', height: '2em'}}
                   value={formatDateTime(addDay(0, new Date(dtFrom)), 'yyyy-mm-dd')}
                   onChange={e => setDtFrom(e.target.value + ' 00:00:00')}/>
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}}
                   value={formatDateTime(addDay(0, new Date(dtTo)), 'yyyy-mm-dd')}
                   onChange={e => setDtTo(e.target.value + ' 00:00:00')}/>
            <div className="selected-filters" onClick={onResetSelectedTag}>{filterTags ? '#' + filterTags : ''}</div>

            <div className="form-check align-content-center py-2" style={{height: '2em'}}>
                <input type="checkbox" className="form-check-input" checked={doneTasks} onChange={e => setDoneTasks(!!e.target.checked)}
                       id="doneTask"/>
                <label className="form-check-label no-select" htmlFor="doneTask">Выполнены</label>
            </div>

            <div className="form-check align-content-center py-2 ms-2" style={{height: '2em'}}>
                <input type="checkbox" className="form-check-input" checked={donePre} onChange={e => setDonePre(!!e.target.checked)}
                       id="pre"/>
                <label className="form-check-label no-select" htmlFor="pre">К выпуску</label>
            </div>
        </div>
    </header>;
}