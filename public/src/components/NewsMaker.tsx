import React, {useEffect, useState} from 'react'
import './style.css'
import {Pane, ResizablePanes} from "resizable-panes-react";
import {debounce, eventBus} from "../utils";
import iconTG from "../assets/tg.svg";
import ProgressBar from './components/ProgressBar/ProgressBar';
import HeaderMenu from "./components/HeaderMenu/HeaderMenu";
import ListNews from "./components/ListNews/ListNews";
import Editor from "./components/Editor/Editor.tsx";
import Tools from "./components/Tools/Tools.tsx";
import axios from "axios";

const host = 'http://localhost:3000/api/v1/';
const listHostToIcon = {'www.theguardian.com': iconTG}

const listPolitics = {
    world: "Мир", europeNews: "Европа", usa: "США", americas: "Америка",
    asia: "Азия", australia: "Австралия", africa: "Африка", middleeast: "Ближний восток",
}
const listScience = {science: "Наука", technology: "Технологии",}
const listSport = {business: "Бизнес", football: "Футбол", cycling: "Велоспорт", formulaone: "F1",}
const listCulture = {
    books: "Книги", tvRadio: "ТВ-Радио", art: "АРТ", film: "Фильмы",
    games: "Игры", classical: "Классика", stage: "Сцена"
};
let arrTypes = [listPolitics, listScience, listCulture, listSport];

type UpdateDBParams = {
    table?: any;
    values?: any;
    condition?: any;
    typeCond?: any;
};
const updateDB: (params: UpdateDBParams) => void = debounce(async ({table = null, values, condition = null, typeCond = null}) => {
    try {
        await axios.post(host + 'update-db', {table, values, condition, typeCond});
    } catch (e) {
        console.log(e)
    }
}, 500);

function NewsMaker() {

    const [arrNews, setArrNews] = useState([])
    const [news, setNews] = useState(null)
    const [arrImg, setArrImg] = useState([])
    const [filterTags, setFilterTags] = useState(null)
    const [typeNews, setTypeNews] = useState('')
    const [progress, setProgress] = useState(0)
    const [textGPT, setTextGPT] = useState('')
    const [currentIndex, setCurrentIndex] = useState(-1)
    const [isExistAudio, setIsExistAudio] = useState(false)

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type === 'progress') setProgress(data)
        });
    }, [])

    useEffect(() => {
        if (!news) return;

        // debugger
        const newNews = {
            ...news,
            ...{option: {image: !!arrImg.length, text: !!textGPT?.length, audio: isExistAudio}}
        }
        setNews(newNews);

        const arrNewNews = [...arrNews];
        arrNewNews[currentIndex] = newNews;
        setArrNews(arrNewNews);

        (async () => {
            await updateDB({
                values: {option: JSON.stringify(newNews.option)},
                condition: {id: newNews.id}
            });
        })()

    }, [arrImg, textGPT, isExistAudio]);

    return (
        <div className="editor d-flex flex-column h-100">
            {progress >= 0 && <ProgressBar progress={progress}/>}
            <HeaderMenu
                setTypeNews={setTypeNews}
                arrButtonSelect={arrTypes}
                typeNews={typeNews}
                host={host}
                setArrNews={setArrNews}
                filterTags={filterTags}
                setFilterTags={setFilterTags}
            />
            <ResizablePanes vertical uniqueId="uid1" className="no-scroll" resizerSize={3}>
                <Pane id="P0" size={4}>
                    <ListNews
                        arrNews={arrNews} arrTypes={arrTypes}
                        filterTags={filterTags}
                        onShowNews={(newsIt: object) => setNews(newsIt)}
                        typeNews={typeNews}
                        listHostToIcon={listHostToIcon}
                        setFilterTags={setFilterTags}
                        setCurrentIndex={setCurrentIndex}
                    />
                </Pane>
                <Pane id="P1" size={9}>
                    <Editor news={news} setNews={setNews} arrImg={arrImg} setArrImg={setArrImg} host={host}
                            textGPT={textGPT} setTextGPT={setTextGPT} setIsExistAudio={setIsExistAudio}
                    />
                </Pane>
                <Pane id="P2" size={4}>
                    <Tools
                        setIsExistAudio={setIsExistAudio}
                        setNews={setNews}
                        setArrImg={setArrImg} host={host}
                        news={news}
                        textGPT={textGPT} setTextGPT={setTextGPT}
                    />
                </Pane>
            </ResizablePanes>
        </div>
    )
}

export default NewsMaker
