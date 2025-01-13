import React, {useEffect, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ListTask from "./Components/ListTask/ListTask.tsx";
import {Button, ButtonGroup, Modal} from "react-bootstrap";
import Dialog from "../Dialog/Dialog";
import {getArrTask, getNameAndDate, updateDB} from "../../utils.ts";
import axios from "axios";
import global from "../../../global.ts";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner.tsx";
import {debounce, eventBus} from "../../../utils.ts";
import {ScrollParent, ScrollChild} from "../Scrollable/Scrollable.tsx";
import glob from "../../../global.ts";

export default function Tools({news, listHostToData}) {

    const [arrTaskList, setArrTaskList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [stateBuildALl, setStateBuildALl] = useState(0)

    const [prompt, setPrompt] = useState('Сделай из этих названий новостей краткий заголовок для новостного видео (вместо запятой используй вертикальную черту)')
    const [titleGPT, setTitleGPT] = useState('')
    const [stateLoadYaGPT, setStateLoadYaGPT] = useState(0)
    const [stateLoadArliGPT, setStateLoadArliGPT] = useState(0)
    const [stateLoadMistralGPT, setStateLoadMistralGPT] = useState(0)
    const [srcImgTitle, setSrcImgTitle] = useState('')

    let isForbiddenAdd: boolean = true;

    useEffect(() => {
        (async () => {
            let _arrTL = await getArrTask();
            if (!_arrTL.length) return;
            const {arr, title} = JSON.parse(_arrTL[0].task)
            setArrTaskList(arr ?? [])
            setTitleGPT(title ?? '')
        })()
    }, []);

    async function onGPT(type) {
        type === 'yandex' && setStateLoadYaGPT(1)
        type === 'arli' && setStateLoadArliGPT(1)
        type === 'mistral' && setStateLoadMistralGPT(1)
        try {

            const textContent = arrTaskList.map(({title}) => title).join(' | ');

            const {data: text} = await axios.post(global.host + 'gpt', {type, text: textContent, prompt});
            setTitleGPT(text)

            updateDB({arrTaskList, title: text, date: (new Date()).getTime()});

            type === 'yandex' && setStateLoadYaGPT(0)
            type === 'arli' && setStateLoadArliGPT(0)
            type === 'mistral' && setStateLoadMistralGPT(0)
        } catch (e) {
            console.log(e)
            type === 'yandex' && setStateLoadYaGPT(2)
            type === 'arli' && setStateLoadArliGPT(2)
            type === 'mistral' && setStateLoadMistralGPT(2)
        }
    }

    const buildAllNews = async () => {
        try {
            // eventBus.dispatchEvent('build-all-news')
            setStateBuildALl(1)
            const _srcImgTitle = (new URL(srcImgTitle)).pathname;
            await axios.post(global.host + 'build-all-news', {task: arrTaskList, title: titleGPT, srcImgTitle: _srcImgTitle});

            setStateBuildALl(0)
        } catch (e) {
            console.error(e)
            setStateBuildALl(2)
        }
    }

    const addToTaskList = () => {
        if (arrTaskList.find(({id}) => id === news.id)) return;
        const _arr = [...arrTaskList, news];
        onChangeData(_arr);
    };

    if (news?.option) {
        const {image, text, audio, video} = news.option
        isForbiddenAdd = !(image && text && audio);
    }

    let onChangeData = (arr: any[]) => {
        console.log(arr);

        arr = arr.map(news => {
            if (news?.name) return news;
            const {id, url, dt, title, titleEn, option, done} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const from = listHostToData[(new URL(url)).host].from;
            return {id, date, name, title, from, option, done}
        });

        updateDB({arrTaskList});

        setTitleGPT('')
        setArrTaskList(arr);
    };

    return (
        <ScrollParent className="pe-1 pb-1">
                     <textarea className="form-control me-1 operation__prompt rounded border mb-1" value={titleGPT}
                               onChange={e => setTitleGPT(e.target.value)} style={{height: '100px'}}/>

            <ButtonGroup>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadYaGPT}
                               onClick={() => onGPT('yandex')}>ya-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadArliGPT}
                               onClick={() => onGPT('arli')}>arli-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadMistralGPT}
                               onClick={() => onGPT('mistral')}>mistral-GPT</ButtonSpinner>
            </ButtonGroup>
            <hr/>
            Список задач:
            <ButtonGroup>
                <Button variant="secondary btn-sm" disabled={isForbiddenAdd} onClick={addToTaskList}>
                    Добавить
                </Button>
                <Button variant="secondary btn-sm" disabled={setArrTaskList.length === 0} onClick={() => setShowModal(true)}>
                    Очистить
                </Button>
            </ButtonGroup>
            <ScrollChild className="my-1 border rounded p-1">
                <ListTask arrData={arrTaskList} onChangeData={onChangeData}/>
            </ScrollChild>
            <div className="d-flex flex-column p-2 mb-1 border rounded text-muted text-center position-relative"
                 onDrop={() => {
                     let src = global.draggingElement.src;
                     setSrcImgTitle(src)
                     global.draggingElement = null;
                 }} onDragOver={e => e.preventDefault()}>
                <img src={srcImgTitle}/>
                <div hidden={srcImgTitle != ''}>Добвьте изображение для обложки...</div>
                <Button hidden={srcImgTitle == ''} variant="danger btn-sm py-0 px-0 " className="position-absolute"
                        style={{lineHeight: '0', height: '22px', width: '22px', right: '12px', top: '12px'}}
                        onClick={() => setSrcImgTitle('')}
                >X</Button>
            </div>
            <ButtonSpinner state={stateBuildALl} className="btn-secondary btn-sm" onClick={buildAllNews}>
                Собрать все видео
            </ButtonSpinner>
            <Dialog title="Очистить" message="Уверены?" show={showModal} setShow={setShowModal} onConfirm={() => onChangeData([])}
                    props={{className: 'modal-sm'}}/>

        </ScrollParent>
    );
}