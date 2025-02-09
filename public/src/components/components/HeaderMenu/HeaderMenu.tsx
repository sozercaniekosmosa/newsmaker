import React, {useEffect, useState} from 'react';
import 'photoswipe/style.css';
import ButtonSpinner from "../Auxiliary/ButtonSpinner/ButtonSpinner";
import {Button, ButtonGroup} from "react-bootstrap";
import {addDay, addHour, eventBus, formatDateTime} from "../../../utils.ts";
import {getData} from "../../utils.ts";
import axios from "axios";
import './style.css'
import glob from "../../../global.ts";
import iconDz from "../../../assets/dzen.ico";
import GroupCheckbox, {TArrName} from "../Auxiliary/Groups/GroupCheckbox/GroupCheckbox.tsx";
import {ButtonSeries} from "../Auxiliary/Groups/ButtonSeries/ButtonSeries.tsx";
import {GeneratorList} from "../Auxiliary/Groups/GeneratorList.tsx";

async function getNewsData(dtFrom: string, dtTo: string, setArrNews, setArrFilter) {
    let arrNews = await getData(dtFrom, dtTo);
    const arrFlt = [...new Set(arrNews.map(({type}) => type))];
    setArrFilter(arrFlt);
    setArrNews(arrNews)
}

function ButtonsTypeList({list, arrFilter}) {
    return Object.entries(list).map(([key, val], index) => {
        return <Button key={index}
                       variant={(arrFilter.includes(key) ? 'secondary' : 'outline-secondary') + ' btn-sm notranslate'}
            // @ts-ignore
                       data-type={key}>{val}</Button>;
    });
}

let idCount = 0;
let getID = () => {
    console.log(idCount);
    return idCount++;
};

export default function HeaderMenu({
                                       arrButtonSelect,
                                       setArrNews,
                                       filterTags,
                                       typeNews,
                                       setTypeNews,
                                       setFilterTags,
                                       doneTasks,
                                       setDoneTasks,
                                       donePre,
                                       setDonePre,
                                       typeServiceGPT,
                                       setTypeServiceGPT,
                                   }) {
    const hourFrom = -6;
// debugger
    const d = formatDateTime(new Date(), 'yyyy-mm-dd 00:00:00')
//     console.log(d)

    const [listGeneral, listPolitics, listPoliticsRU, listScience, listCulture, listSport] = arrButtonSelect as Object[];
    const [arrFilter, setArrFilter] = useState([])
    const [dtFrom, setDtFrom] = useState(formatDateTime(addHour(hourFrom, new Date(d)), 'yyyy-mm-dd hh:MM:ss'))
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
        if (target.tagName !== 'BUTTON') return;
        if (target === currentTarget) return;

        const {dataset: {type}} = target;
        currentTarget.querySelector('.header-type-flt .selected-news-type')?.classList.remove('selected-news-type')
        target.classList.add('selected-news-type')
        setTypeNews(type)
        console.log(type)
    }

    async function onUpdateAllNews(newsSrc) {
        try {
            await axios.post(glob.hostAPI + 'update-news-type', {typeNews, newsSrc})
            const from = formatDateTime(addDay(hourFrom, new Date()), 'yyyy-mm-dd');
            let to = formatDateTime(new Date(), 'yyyy-mm-dd');

            if (from + to != dtFrom + dtTo) {
                setDtFrom(from)
                setDtTo(to)
            } else {
                await getNewsData(dtFrom, dtTo, setArrNews, setArrFilter);
            }

            return 0;

        } catch (e) {
            console.log(e)
            return 2;
        }

    }

    let onChangeServiceGPT = (type) => {
        setTypeServiceGPT(type)
    };

    const arrNames: TArrName = [
        ['YA', 'yandex'],
        ['RA', 'arli'],
        ['MI', 'mistral'],
    ];

    function getGroupHeaderButton(key: string, val: string, index: string) {
        var variant = (arrFilter.includes(key) ? 'secondary' : 'outline-secondary') + ' btn-sm notranslate';
        return <Button key={index} data-type={key} variant={variant}>{val}</Button>
    }

    const getAllGroupHeaderButton = (list: [], idi) => <ButtonGroup key={idi}>
        <GeneratorList arrParam={Object.entries(list)} onGenerate={getGroupHeaderButton}/>
    </ButtonGroup>;

    return <header>
        <div className="header-type-flt" onClick={onSelectSrcNews}>
            <div className="d-flex gap-1 no-select">
                <Button variant="secondary btn-sm notranslate selected-news-type" data-type={''}>Все</Button>
                <GeneratorList arrParam={arrButtonSelect} onGenerate={getAllGroupHeaderButton}/>
            </div>
        </div>
        <div className="header-control-flt d-flex flex-row notranslate">
            <ButtonSpinner className="btn-secondary btn-sm notranslate d-flex align-items-center"
                           onAction={() => onUpdateAllNews('DZ')}>
                <img src={iconDz} className="news-icon" alt={iconDz}/>
            </ButtonSpinner>

            <input type="date" className="form-control" style={{width: '8em', height: '2em'}}
                   value={formatDateTime(addDay(0, new Date(dtFrom)), 'yyyy-mm-dd')}
                   onChange={e => setDtFrom(e.target.value + ' 00:00:00')}/>
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}}
                   value={formatDateTime(addDay(0, new Date(dtTo)), 'yyyy-mm-dd')}
                   onChange={e => setDtTo(e.target.value + ' 00:00:00')}/>
            <div className="selected-filters" onClick={onResetSelectedTag}>{filterTags ? '#' + filterTags : ''}</div>
            <div className="d-flex flex-row gap-3">
                <div className="d-flex flex-row gap-1 text-nowrap align-items-center">
                    <input type="checkbox" checked={doneTasks}
                           onChange={e => setDoneTasks(!!e.target.checked)} id="doneTask"/>
                    Выполнены
                </div>
                <div className="d-flex flex-row gap-1 text-nowrap align-items-center">
                    <input type="checkbox" checked={donePre}
                           onChange={e => setDonePre(!!e.target.checked)} id="pre"/>
                    К выпуску
                </div>
                <GroupCheckbox state={typeServiceGPT} arrNames={arrNames} onChange={onChangeServiceGPT}/>
            </div>
        </div>
    </header>;
}