import React, {useEffect, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import {Button, ButtonGroup} from "react-bootstrap";
import Dialog from "../Auxiliary/Dialog/Dialog";
import {getTasks, toGPT, updateNewsDB, updateTaskDB, updateTaskDBForced} from "../../utils.ts";
import axios from "axios";
import global from "../../../global.ts";
import glob from "../../../global.ts";
import ButtonSpinner from "../Auxiliary/ButtonSpinner/ButtonSpinner.tsx";
import {ScrollChildY, ScrollParent} from "../Auxiliary/Scrollable/Scrollable.tsx";
import {eventBus, formatDateTime} from "../../../utils.ts";
import DraggableList from "../Auxiliary/DraggableList/DraggableList.tsx";

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

export default function Tools({news, arrNews}) {

    const [arrTaskList, setArrTaskList] = useState([]);
    const [showModalRemoveAnTask, setShowModalRemoveAnTask] = useState(false);
    const [showModalRemoveAllTask, setShowModalRemoveAllTask] = useState(false);
    const [stateBuildALl, setStateBuildALl] = useState(0)

    const [prompt, setPrompt] = useState('Сделай из этих названий новостей краткий заголовок для новостного видео (вместо запятой используй вертикальную черту)')
    const [datePublic, setDatePublic] = useState('')
    const [mainTitle, setMainTitle] = useState('')
    const [titleGPT, setTitleGPT] = useState('')
    const [stateLoadYaGPT, setStateLoadYaGPT] = useState(0)
    const [stateLoadArliGPT, setStateLoadArliGPT] = useState(0)
    const [stateLoadMistralGPT, setStateLoadMistralGPT] = useState(0)
    const [srcImgTitle, setSrcImgTitle] = useState('')
    const [srcImgMain, setSrcImgMain] = useState('')
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [stateLoadGPT, setStateLoadGPT] = useState({type: '', state: 0});

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

    async function onGPT(type) {
        const textContent = arrTaskList.map(({title}) => title).join(' | ');
        console.log(textContent)
        setStateLoadGPT({type, state: 1})
        const title = await toGPT(type, prompt, textContent)
        setStateLoadGPT({type, state: title ? 0 : 2})
        const list = '- ' + title.split(' | ').join('\n- ')
        setTitleGPT(title + '\n' + list)
        updateTaskDB({title: title + '\n' + list});
    }

    const buildAllNews = async () => {
        try {
            setStateBuildALl(1)

            await axios.post(global.hostAPI + 'build-all-news');

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
        const list = {arrTask: [], title: '', date: '', srcImg: '', mainTitle: ''}
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
            <ButtonGroup>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadGPT.type == 'yandex' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('yandex')}>ya-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadGPT.type == 'arli' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('arli')}>arli-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadGPT.type == 'mistral' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('mistral')}>mistral-GPT</ButtonSpinner>
            </ButtonGroup>
            <hr/>
            Список задач:
            <ButtonGroup>
                <Button variant="secondary btn-sm" disabled={!(news?.arrImg.length && news?.audioDur)}
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
                            key={index} data-id={id} style={arrNews[indexNews].videoDur == 0 ? {backgroundColor: '#ffdddd'} : {}}>
                            <div className="d-flex flex-row">
                                <span className="notranslate">{arrNews[indexNews].arrImg?.length ? '🖼️' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].textGPT ? '📝' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].audioDur > 0 ? '🎵' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].videoDur > 0 ? '🎥' : ''}</span>
                                <span className="notranslate">{arrNews[indexNews].donde > 0 ? '✅' : ''}</span>
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
                <Button hidden={srcImgMain == ''} variant="secondary btn-sm py-0 px-0 " className="position-absolute"
                        style={{lineHeight: '0', height: '22px', width: '22px', left: '12px', top: '12px'}}
                        onClick={onCreateMainImg}
                ><strong>✓</strong></Button>
            </div>
            <ButtonGroup>
                <ButtonSpinner state={0} hidden={false} className="btn-secondary btn-sm"
                               onClick={() => axios.post(glob.hostAPI + 'open-dir')}>
                    Открыть
                </ButtonSpinner>
                <ButtonSpinner state={stateBuildALl} disabled={srcImgMain == '' || isAllowBuildAll == false} className="btn-secondary btn-sm"
                               onClick={buildAllNews}>
                    Собрать все видео ({Math.trunc(totalDur / 60)} мин)
                </ButtonSpinner>
                {/*<Button onClick={onCreateMainImg}>tst</Button>*/}
            </ButtonGroup>
            <Dialog title="Удалить эелемент" message="Уверены?" show={showModalRemoveAnTask}
                    setShow={setShowModalRemoveAnTask}
                    onConfirm={onConfirmRemoveAnTask} props={{className: 'modal-sm'}}/>
            <Dialog title="Очистить" message="Уверены?" show={showModalRemoveAllTask} setShow={setShowModalRemoveAllTask}
                    onConfirm={onConfirmRemoveAllTask} props={{className: 'modal-sm'}}/>

        </ScrollParent>
    );
}