import React, {useEffect, useState} from 'react'
import './style.css'
import {Pane, ResizablePanes} from "resizable-panes-react";
import {eventBus} from "../utils";
import ProgressBar from './components/ProgressBar/ProgressBar';
import HeaderMenu from "./components/HeaderMenu/HeaderMenu";
import ListNews from "./components/ListNews/ListNews";
import Editor from "./components/Editor/Editor.tsx";
import Tools from "./components/Tools/Tools.tsx";
import glob from "../global.ts";
import iconDZ from "../assets/dzen.ico";

glob.host = 'http://localhost:3000/api/v1/'
const listHostToData = {
    'dzen.ru': {icon: iconDZ, from: null, short: 'DZ'},
}

const listGeneral = {
    world: "Мир",
    // now: 'Сейчас',//++
    interest: 'Интересное',//++
    showbusiness: 'Шоубизнес',//++
    auto: 'Авто',//++
}
const listPolitics = {
    // gaza: 'Газа',
    politics: 'Политика',
    svo: 'СВО',
    // sanctions: 'Санкции',
    // europeNews: "Европа", usa: "США", americas: "Америка",
    // asia: "Азия", australia: "Австралия", africa: "Африка", middleeast: "Ближний восток",
    business: "Бизнес",
}
const listPoliticsRU = {
    // politicsrus: 'Политика РУ',
    // regions: 'Регионы',
    // investigation: 'Расследования',
    incidents: 'Происшествия',
    social: 'Общество',
    // belorus: 'Белорусы',
    // army: 'Армия',
    // moldova: 'Молдова',
    // pribalty: 'Балтика',
    // kavkaz: 'Кавказ',
}
const listScience = {
    science: "Наука",
    technology: "Технологии",
    // cosmos: 'Космос',
    // medicine: 'Медицина',
    // biology: 'Биология',
    // history: 'История',
    // archeology: 'Археология',
    // ecology: 'Экология',
    // physics: 'Физика',
    // chemistry: 'Химия',
    // sociology: 'Социология',
}
const listSport = {
    // football: "Футбол", cycling: "Велоспорт", formulaone: "F1",
    // tennis: 'Теннис',
    // fighting: 'Бокс+MMA',
    // hokkey: 'Хоккей',
    // figures: 'Фигуристы',
    // summer: 'Летний',
    // winter: 'Зимний',
}
const listCulture = {
    culture: 'Культура',
    // internet: 'Интернет',
    // entertainment: 'Развлечения',
    // socialnetworks: 'Соц.сети',
    // nature: 'Природа',
    // books: "Книги", tvRadio: "ТВ-Радио", art: "АРТ", film: "Фильмы",
    // games: "Игры", classical: "Классика", stage: "Сцена"
};
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
        eventBus.addEventListener('message-socket', ({type, data}) => {
            if (type === 'progress') setProgress(data)
        });
    }, [])

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
                        setNews={setNews} typeNews={typeNews} listHostToData={listHostToData} setFilterTags={setFilterTags}
                        doneTasks={doneTasks} donePre={donePre}
                    />
                </Pane>
                <Pane id="P1" size={9}>
                    <Editor
                        news={news} setNews={setNews}
                        arrNews={arrNews}
                        setArrNews={setArrNews}
                        listHostToData={listHostToData}
                    />
                </Pane>
                <Pane id="P2" size={4}>
                    <Tools news={news} listHostToData={listHostToData}/>
                </Pane>
            </ResizablePanes>
        </div>
    )
}

export default NewsMaker
