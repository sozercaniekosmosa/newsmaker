import React, {useEffect, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ListTask from "./Components/ListTask/ListTask.tsx";
import {Button, ButtonGroup, Modal} from "react-bootstrap";
import Dialog from "../Dialog/Dialog";
import {getArrTask, getNameAndDate, updateDB} from "../../utils.ts";
import axios from "axios";
import glob from "../../../global.ts";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner.tsx";

export default function Tools({news, listHostToData}) {

    const [arrTaskList, setArrTaskList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [stateBuildALl, setStateBuildALl] = useState(0)
    let isForbiddenAdd: boolean = true;

    useEffect(() => {
        (async () => {
            let _arrTL = await getArrTask();
            if (!_arrTL.length) return;
            const _arrTaskList = JSON.parse(_arrTL[0].arrTask)
            setArrTaskList(_arrTaskList)
        })()
    }, []);

    const buildAllNews = async () => {
        try {
            setStateBuildALl(1)
            const res = await axios.post(glob.host + 'build-all-news', arrTaskList);
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
        isForbiddenAdd = !(image && text && audio && video);
    }

    let onChangeData = (arr: any[]) => {
        console.log(arr);

        arr = arr.map(news => {
            if (news?.name) return news;
            const {id, url, dt, title, titleEn} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            const from = listHostToData[(new URL(url)).host].from;
            return {id, date, name, title, from}
        });

        updateDB({
            "table": 'tasks',
            values: {arrTask: JSON.stringify(arr)},
            condition: {id: 0}
        });

        setArrTaskList(arr);
    };

    return (
        <div className="operation d-flex flex-column h-100 notranslate me-1">
            <div className="d-flex flex-column p-2 mb-2 border rounded">
                <ButtonGroup className="mb-2">
                    <Button variant="secondary btn-sm" disabled={isForbiddenAdd} onClick={addToTaskList}>
                        Добавить
                    </Button>
                    <Button variant="secondary btn-sm" disabled={setArrTaskList.length === 0} onClick={() => setShowModal(true)}>
                        Очистить
                    </Button>
                </ButtonGroup>
                Список задач:
                <ListTask arrData={arrTaskList} onChangeData={onChangeData}/>
                <Dialog title="Очистить" message="Уверены?" show={showModal} setShow={setShowModal}
                        onConfirm={() => onChangeData([])}
                        props={{className: 'modal-sm'}}/>
            </div>
            <ButtonSpinner state={stateBuildALl} className="btn-secondary btn-sm" onClick={buildAllNews}>
                Собрать все
            </ButtonSpinner>
        </div>
    );
}