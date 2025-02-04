import React, {useEffect, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import {Button, ButtonGroup} from "react-bootstrap";
import Dialog from "../Auxiliary/Dialog/Dialog";
import {getTasks, toGPT, updateNewsDB, updateTaskDB, updateTaskDBForced} from "../../utils.ts";
import axios from "axios";
import global from "../../../global.ts";
import ButtonSpinner from "../Auxiliary/ButtonSpinner/ButtonSpinner.tsx";
import {ScrollChildY, ScrollParent} from "../Auxiliary/Scrollable/Scrollable.tsx";
import {eventBus, formatDateTime} from "../../../utils.ts";
import DraggableList from "../Auxiliary/DraggableList/DraggableList.tsx";
import {ListButton, TOnAction, TArrParam} from "../Auxiliary/ListButton/ListButton.tsx";

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

const promptGeneralDesc = 'Сделай из этих названий новостей краткий заголовок до трех слов максимально короткими словами для новостного видео (вместо запятой используй вертикальную черту)';
const promptImgDesc = 'Добавь эмодзи по смыслу перед пунктами и сократи каждый пункт до трех слов максимально короткими словами';

export default function Tools({news, arrNews, typeServiceGPT}) {

    const [arrTaskList, setArrTaskList] = useState([]);
    const [showModalRemoveAnTask, setShowModalRemoveAnTask] = useState(false);
    const [showModalRemoveAllTask, setShowModalRemoveAllTask] = useState(false);

    const [datePublic, setDatePublic] = useState('')
    const [mainTitle, setMainTitle] = useState('')
    const [titleGPT, setTitleGPT] = useState('')
    const [srcImgTitle, setSrcImgTitle] = useState('')
    const [srcImgMain, setSrcImgMain] = useState('')
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            const {arrTask, title, date, srcImg, srcImgMain, mainTitle} = await getTasks();
            setArrTaskList(arrTask);
            setTitleGPT(title);
            setSrcImgTitle(srcImg);
            setSrcImgMain(!!srcImgMain ? srcImgMain : srcImg);
            setDatePublic(date);
            setMainTitle(mainTitle);
        })()
    }, []);

    const onGPT: TOnAction = async (name, prompt) => {
        const textContent = arrTaskList.map(({title}) => title).join(' | ');

        const title = await toGPT(typeServiceGPT, prompt, textContent)
        const list = '- ' + title.split(' | ').join('\n- ')
        const str = title + '\n\n' + global.links + '\n\n' + list;
        setTitleGPT(str)
        updateTaskDB({title: str});
        return title ? 0 : 2
    };

    async function onGPTImgDesc(type, prompt) {
        const textContent = arrTaskList.map(({title}) => title).splice(0, 3).join('\n');

        const title = await toGPT(type, prompt, textContent)
        const list = title.split('\n').join('</br>\n')

        onChangeData({mainTitle: list}, setMainTitle)
        return title ? 0 : 2
    }

    const buildAllNews = async () => {
        try {
            await axios.post(global.hostAPI + 'build-all-news');

            const arrUpdateDb = arrTaskList.map(it => ({...it, done: true}));
            updateNewsDB(arrUpdateDb);
            eventBus.dispatchEvent('message-local', {type: 'update-news-arr-item', data: arrUpdateDb})

            return 0;
        } catch (e) {
            console.error(e)
            return 2;
        }
    }

    const addToTaskList = () => {
        if (arrTaskList.find(({id}) => id === news.id)) return;

        if (datePublic == '') {
            const date = formatDateTime(new Date(), 'yyyy-mm-ddThh:MM:ss')
            setDatePublic(date);
            updateTaskDBForced({date});
        }

        onChangeData({arrTask: [...arrTaskList, {id: news.id, title: news.title}]}, setArrTaskList);
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

    let onConfirmRemoveAllTask = () => {
        const list = {arrTask: [], title: '', date: '', srcImg: '', srcImgMain: '', mainTitle: ''}
        setDatePublic('');
        setMainTitle(list.mainTitle);
        setTitleGPT(list.title);
        setArrTaskList(list.arrTask);
        setSrcImgTitle(list.srcImg);
        setSrcImgMain(list.srcImg);

        updateTaskDB(list);
    }


    const onConfirmRemoveAnTask = () => {
        if (itemToDelete !== null) {
            arrTaskList.splice(itemToDelete, 1)
            onChangeList && onChangeList(arrTaskList);
            setShowModalRemoveAnTask(false);
            setItemToDelete(null);
        }
    };

    const onCreateMainImg = async () => {
        if (!datePublic) return;
        let filePathOut = `./public/public/done/` + formatDateTime(new Date(datePublic), 'yy-mm-dd_hh_MM_ss' + '/title.png');
        let urlMainTitle = `/done/` + formatDateTime(new Date(datePublic), 'yy-mm-dd_hh_MM_ss' + '/title.png?' + new Date().getTime());
        await axios.post(global.hostAPI + 'create-main-image', {filePathOut});
        onChangeData({srcImgMain: urlMainTitle}, setSrcImgMain)
    };

    const onTest = async () => {
        let filePathOut = `./public/public/done/` + formatDateTime(new Date(datePublic), 'yy-mm-dd_hh_MM_ss' + '/title.png');
        let urlMainTitle = `/done/` + formatDateTime(new Date(datePublic), 'yy-mm-dd_hh_MM_ss' + '/title.png?' + new Date().getTime());
        await axios.post(global.hostAPI + 'create-news', {filePathOut});
        // onChangeData({srcImgMain: urlMainTitle}, setSrcImgMain)
    };

    let _arr = [];
    for (const {id} of arrTaskList) {
        let index = arrNews.findIndex(it => it.id == id);
        if (~index) _arr.push(arrNews[index]);
    }
    const isAllowBuildAll = _arr.every(it => it?.videoDur ?? 0)
    const totalDur = _arr.reduce((acc, it) => acc + (+it.videoDur), 0);


    return (
        <ScrollParent className="pe-1 pb-1">
            <input type="datetime-local" value={datePublic}
                   onChange={(e) => onChangeData({date: e.target.value}, setDatePublic)}
                   className="border rounded mb-1 text-center no-select"/>
            <textarea className="form-control me-1 operation__prompt rounded border mb-1" value={titleGPT}
                      style={{height: '100px'}}
                      onChange={e => onChangeData({title: e.target.value}, setTitleGPT)}/>
            <ListButton arrParam={[['Подготовить', promptGeneralDesc]]} onAction={onGPT}/>
            <hr/>
            Список задач:
            <ButtonGroup>
                <Button variant="secondary btn-sm" disabled={!!(news?.arrImg.length && news?.audioDur)}
                        onClick={addToTaskList}>
                    Добавить
                </Button>
                <Button variant="secondary btn-sm" disabled={setArrTaskList.length === 0} onClick={() => {
                    setShowModalRemoveAllTask(true)
                }}>
                    Очистить
                </Button>
            </ButtonGroup>
            <ScrollChildY className="my-1 border rounded p-1">
                <DraggableList
                    onChange={onChangeSort} className="d-flex flex-column flex-stretch list-group"
                    onClick={({target}) => eventBus.dispatchEvent('message-local', {
                        type: 'news-show',
                        data: target.dataset.id
                    })}>
                    {arrTaskList.map(({title, id}, index) => {

                        const indexNews = arrNews.findIndex(it => it.id == id);
                        if (!~indexNews) return;

                        return <div
                            className="sortable d-flex justify-content-between align-items-center px-1 py-1 m-0 border list-group-item"
                            key={index} data-id={id}
                            style={arrNews[indexNews].videoDur == 0 ? {backgroundColor: '#ffdddd'} : {}}>
                            <div className="d-flex flex-row">
                                <span className="notranslate">{arrNews[indexNews].arrImg?.length ? '🖼️' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].textGPT ? '📝' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].audioDur > 0 ? '🎵' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].videoDur > 0 ? '🎥' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].donde > 0 ? '✅' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews]?.length ? '📬' : ''}</span>
                            </div>
                            <div className="text-truncate pe-1 ev-none" title={title}>{title}</div>
                            <Button variant="secondary btn-sm p-0" style={{height: '27px', width: '27px', flex: 'none'}}
                                    onClick={(e) => {
                                        setItemToDelete(index);
                                        setShowModalRemoveAnTask(true)
                                        e.stopPropagation();
                                    }}>X</Button>
                        </div>
                    })}
                </DraggableList>
            </ScrollChildY>
            <textarea className="form-control me-1 operation__prompt rounded border mb-1" value={mainTitle}
                      style={{height: '70px'}}
                      onChange={e => onChangeData({mainTitle: e.target.value}, setMainTitle)}/>
            <div className="d-flex flex-column p-2 mb-1 border rounded text-muted text-center position-relative"
                 style={srcImgMain == '' ? {backgroundColor: '#ffdddd'} : {}}
                 onDrop={() => {
                     let src = global.draggingElement.src;
                     setSrcImgTitle(src)
                     setSrcImgMain(src)
                     global.draggingElement = null;
                     updateTaskDB({srcImg: src});
                 }} onDragOver={e => e.preventDefault()}>
                <img src={srcImgMain}/>
                <div hidden={srcImgMain != ''}>Добвьте изображение для обложки...</div>
                <Button hidden={srcImgMain == ''} variant="danger btn-sm py-0 px-0 " className="position-absolute"
                        style={{lineHeight: '0', height: '22px', width: '22px', right: '12px', top: '12px'}}
                        onClick={() => {
                            setSrcImgTitle('');
                            setSrcImgMain('');
                            updateTaskDB({srcImg: ''});
                        }}
                >X</Button>
                <ButtonSpinner hidden={srcImgMain == ''} className="btn-sm btn-secondary position-absolute"
                               style={{lineHeight: '0', height: '22px', width: '22px', left: '12px', top: '12px'}}
                               onAction={() => onGPTImgDesc('mistral', promptImgDesc)}
                >*</ButtonSpinner>
                <Button hidden={srcImgMain == ''} variant="secondary btn-sm py-0 px-0 " className="position-absolute"
                        style={{lineHeight: '0', height: '22px', width: '22px', left: '45%', top: '12px'}}
                        onClick={onCreateMainImg}
                ><strong>✓</strong></Button>
            </div>
            <ButtonGroup>
                <Button className="btn-secondary btn-sm"
                        onClick={() => axios.post(global.hostAPI + 'open-dir')}>Открыть</Button>
                <ButtonSpinner disabled={(srcImgMain == '' || isAllowBuildAll == false)}
                               className="btn-secondary btn-sm"
                               onAction={buildAllNews}>
                    Собрать все видео ({Math.trunc(totalDur / 60)} мин)
                </ButtonSpinner>
                {/*<Button onClick={onTest}>tst</Button>*/}
            </ButtonGroup>
            <Dialog title="Удалить эелемент" message="Уверены?" show={showModalRemoveAnTask}
                    setShow={setShowModalRemoveAnTask}
                    onConfirm={onConfirmRemoveAnTask} props={{className: 'modal-sm'}}/>
            <Dialog title="Очистить" message="Уверены?" show={showModalRemoveAllTask}
                    setShow={setShowModalRemoveAllTask}
                    onConfirm={onConfirmRemoveAllTask} props={{className: 'modal-sm'}}/>

        </ScrollParent>
    );
}