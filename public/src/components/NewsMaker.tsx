import React, {useEffect, useState} from 'react'
import './style.css'
import {Pane, ResizablePanes} from "resizable-panes-react";
import {eventBus} from "../utils";
import ProgressBar from './components/Auxiliary/ProgressBar/ProgressBar';
import HeaderMenu from "./components/HeaderMenu/HeaderMenu";
import ListNews from "./components/ListNews/ListNews";
import Editor from "./components/Editor/Editor.tsx";
import Tools from "./components/Tools/Tools.tsx";
import glob from "../global.ts";
import iconDZ from "../assets/dzen.ico";

glob.host = 'http://localhost:3000/'
glob.hostAPI = 'http://localhost:3000/api/v1/'
const listHostToIcon = {
    'dzen.ru': iconDZ,
}

const listGeneral = {world: "Мир", interest: 'Интересное',/*++*/ showbusiness: 'Шоубизнес',/*++*/ auto: 'Авто',/*++*/};
const listPolitics = {politics: 'Политика', svo: 'СВО', business: "Бизнес",};
const listPoliticsRU = {incidents: 'Происшествия', social: 'Общество',};
const listScience = {science: "Наука", technology: "Технологии",};
const listSport = {};
const listCulture = {culture: 'Культура',};
let arrTypes = [listGeneral, listPolitics, listPoliticsRU, listScience, listCulture, listSport];

function NewsMaker() {

    const [arrNews, setArrNews] = useState([])

    const [filterTags, setFilterTags] = useState(null)
    const [typeNews, setTypeNews] = useState('')
    const [progress, setProgress] = useState(0)
    const [news, setNews] = useState(null)
    const [doneTasks, setDoneTasks] = useState(false)
    const [donePre, setDonePre] = useState(false)

    useEffect(() => {
        const socketHandler = ({type, data}) => {
            if (type === 'progress') setProgress(data)
        };

        const localHandler = (({type, data: arrUpdNews}) => {
            if (type === 'update-news-arr-item') {

                setArrNews((nowArrNews) => {
                    const newArrNews = [...nowArrNews];
                    for (let i = 0; i < arrUpdNews.length; i++) {
                        const index = nowArrNews.findIndex(it => it.id == arrUpdNews[i].id);
                        if (!~index) throw 'update-news-arr-item: ID does not exist'
                        newArrNews[index] = arrUpdNews[i];
                    }
                    return newArrNews;
                });

            }
        });

        eventBus.addEventListener('message-socket', socketHandler);
        eventBus.addEventListener('message-local', localHandler)

        return () => {
            eventBus.removeEventListener('message-socket', socketHandler);
            eventBus.removeEventListener('message-local', localHandler);
        }
    }, [])


    useEffect(() => {
        if (!news) return;

        const index = arrNews.findIndex(({id}) => id == news.id)

        setArrNews(now => {
            const newArr = [...now];
            newArr[index] = news;
            return newArr;
        });

    }, [news]);

    return (
        <div className="editor d-flex flex-column h-100">
            {progress >= 0 && <ProgressBar progress={progress}/>}
            <HeaderMenu
                setTypeNews={setTypeNews} arrButtonSelect={arrTypes} typeNews={typeNews} setArrNews={setArrNews} filterTags={filterTags}
                setFilterTags={setFilterTags} doneTasks={doneTasks} setDoneTasks={setDoneTasks} donePre={donePre} setDonePre={setDonePre}
            />
            <ResizablePanes vertical uniqueId="uid1" className="no-scroll" resizerSize={3}>
                <Pane id="P0" size={4}>
                    <ListNews
                        arrNews={arrNews} arrTypes={arrTypes} filterTags={filterTags}
                        setNews={setNews} typeNews={typeNews} listHostToData={listHostToIcon} setFilterTags={setFilterTags}
                        doneTasks={doneTasks} donePre={donePre}
                    />
                </Pane>
                <Pane id="P1" size={9}>
                    <Editor news={news} setNews={setNews} listHostToData={listHostToIcon}/>
                </Pane>
                <Pane id="P2" size={4}>
                    <Tools news={news} arrNews={arrNews}/>
                </Pane>
            </ResizablePanes>
        </div>
    )
}

export default NewsMaker
