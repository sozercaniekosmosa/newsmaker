import React, {useEffect, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ListTask from "./Components/ListTask/ListTask.tsx";
import {Button, ButtonGroup} from "react-bootstrap";
import Dialog from "../Dialog/Dialog";
import {getTasks, updateNewsDB, updateTaskDB, updateTaskDBForced} from "../../utils.ts";
import axios from "axios";
import global from "../../../global.ts";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner.tsx";
import {ScrollChildX, ScrollChildY, ScrollParent} from "../Scrollable/Scrollable.tsx";
import {eventBus, formatDateTime} from "../../../utils.ts";
import glob from "../../../global.ts";
import DraggableList from "../Editor/components/DraggableList/DraggableList.tsx";

function arrMoveItem(arr, fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
        throw new Error('Индексы выходят за пределы массива');
    }

    // Извлекаем элемент из старого индекса
    const element = arr.splice(fromIndex, 1)[0];

    // Вставляем элемент на новый индекс
    arr.splice(toIndex, 0, element);

    return arr;
}

export default function Tools({news}) {

    const [arrTaskList, setArrTaskList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [stateBuildALl, setStateBuildALl] = useState(0)

    const [prompt, setPrompt] = useState('Сделай из этих названий новостей краткий заголовок для новостного видео (вместо запятой используй вертикальную черту)')
    const [datePublic, setDatePublic] = useState('')
    const [titleGPT, setTitleGPT] = useState('')
    const [stateLoadYaGPT, setStateLoadYaGPT] = useState(0)
    const [stateLoadArliGPT, setStateLoadArliGPT] = useState(0)
    const [stateLoadMistralGPT, setStateLoadMistralGPT] = useState(0)
    const [srcImgTitle, setSrcImgTitle] = useState('')

    useEffect(() => {
        (async () => {
            const {arrTask, title, date, srcImg} = await getTasks();
            setArrTaskList(arrTask);
            setTitleGPT(title);
            setSrcImgTitle(srcImg);
            setDatePublic(date);
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

            updateTaskDB({title: text});

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
            setStateBuildALl(1)

            await axios.post(global.host + 'build-all-news');

            const arrUpdateDb = arrTaskList.map(it => ({...it, done: true}));
            updateNewsDB(arrUpdateDb);
            eventBus.dispatchEvent('message-local', {type: 'update-news-arr-item', data: arrUpdateDb})

            setStateBuildALl(0)
        } catch (e) {
            console.error(e)
            setStateBuildALl(2)
        }
    }

    const addToTaskList = () => {
        if (arrTaskList.find(({id}) => id === news.id)) return;

        if (datePublic == '') {
            const date = formatDateTime(new Date(), 'yyyy-mm-ddThh:MM:ss')
            setDatePublic(date);
            updateTaskDBForced({date});
        }

        onChangeData({arrTask: [...arrTaskList, news]}, setArrTaskList);
    };

    let onChangeData = (obj, stateForUpd) => {
        updateTaskDB({...obj});
        stateForUpd(Object.values(obj)[0]);
    };

    let onChangeList = (arr) => {
        updateTaskDB({arrTask: arr});
        setArrTaskList(arr);
    }

    let onChangeSort = (nodeIndex, targetIndex) => {
        const _arr = arrMoveItem([...arrTaskList], nodeIndex, targetIndex)
        setArrTaskList(_arr);
        updateTaskDB({arrTask: _arr});
    }

    let onRemoveAll = () => {
        const list = {arrTask: [], title: '', date: null, srcImg: ''}
        setDatePublic('');
        setTitleGPT(list.title);
        setArrTaskList(list.arrTask);
        setSrcImgTitle(list.srcImg);

        updateTaskDB(list);
    }

    return (
        <ScrollParent className="pe-1 pb-1">
            <input type="datetime-local" value={datePublic} onChange={(e) => onChangeData({date: e.target.value}, setDatePublic)}
                   className="border rounded mb-1 text-center no-select"/>
            <textarea className="form-control me-1 operation__prompt rounded border mb-1" value={titleGPT} style={{height: '100px'}}
                      onChange={e => onChangeData({title: e.target.value}, setTitleGPT)}/>
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
                <Button variant="secondary btn-sm" disabled={!(news?.arrImg.length && news?.audioDur)}
                        onClick={addToTaskList}>
                    Добавить
                </Button>
                <Button variant="secondary btn-sm" disabled={setArrTaskList.length === 0} onClick={() => setShowModal(true)}>
                    Очистить
                </Button>
            </ButtonGroup>
            <ScrollChildY className="my-1 border rounded p-1">
                <ListTask arrData={arrTaskList} onChangeList={onChangeList}/>
                {/*<DraggableList onChange={onChangeSort} className="d-flex flex-column flex-stretch">*/}
                {/*    {arrTaskList.map(({title}, index) => {*/}
                {/*        return <div className="d-flex justify-content-between align-items-center px-1 py-1 m-0" key={index}>*/}
                {/*            <div className="text-truncate pe-1" title={title}>{title}</div>*/}
                {/*            <Button variant="secondary btn-sm p-0" style={{height: '27px', width: '27px', flex: 'none'}}*/}
                {/*                    onClick={() => null}>X</Button>*/}
                {/*        </div>*/}
                {/*    })}*/}
                {/*</DraggableList>*/}
            </ScrollChildY>
            <div className="d-flex flex-column p-2 mb-1 border rounded text-muted text-center position-relative"
                 onDrop={() => {
                     let src = global.draggingElement.src;
                     setSrcImgTitle(src)
                     global.draggingElement = null;
                     updateTaskDB({srcImg: src});
                 }} onDragOver={e => e.preventDefault()}>
                <img src={srcImgTitle}/>
                <div hidden={srcImgTitle != ''}>Добвьте изображение для обложки...</div>
                <Button hidden={srcImgTitle == ''} variant="danger btn-sm py-0 px-0 " className="position-absolute"
                        style={{lineHeight: '0', height: '22px', width: '22px', right: '12px', top: '12px'}}
                        onClick={() => {
                            setSrcImgTitle('');
                            updateTaskDB({srcImg: ''});
                        }}
                >X</Button>
            </div>
            <ButtonGroup>
                <ButtonSpinner state={0} hidden={false} className="btn-secondary btn-sm"
                               onClick={() => axios.post(glob.host + 'open-dir')}>
                    Открыть
                </ButtonSpinner>
                <ButtonSpinner state={stateBuildALl} className="btn-secondary btn-sm" onClick={buildAllNews}>
                    Собрать все видео
                </ButtonSpinner>
            </ButtonGroup>
            <Dialog title="Очистить" message="Уверены?" show={showModal} setShow={setShowModal} onConfirm={() => onRemoveAll()}
                    props={{className: 'modal-sm'}}/>

        </ScrollParent>
    );
}