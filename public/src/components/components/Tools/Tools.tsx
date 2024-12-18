import React, {useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ListTask from "./Components/ListTask/ListTask.tsx";
import {Button, ButtonGroup, Modal} from "react-bootstrap";
import Dialog from "../Dialog/Dialog";

export default function Tools({news}) {

    const [arrTaskList, setArrTaskList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    let isForbiddenAdd: boolean = true;

    if (news?.option) {
        const {image, text, audio, video} = news.option
        isForbiddenAdd = !(image && text && audio && video);
    }

    const addToTaskList = () => !arrTaskList.find(({id}) => id === news.id) && setArrTaskList([...arrTaskList, news]);

    return (
        <div className="operation d-flex flex-column h-100 notranslate">
            <div className="d-flex flex-column p-2 border rounded">
                <ButtonGroup className="mb-2">
                    <Button variant="secondary btn-sm" disabled={isForbiddenAdd} onClick={addToTaskList}>
                        Добавить
                    </Button>
                    <Button variant="secondary btn-sm" disabled={setArrTaskList.length === 0} onClick={() => setShowModal(true)}>
                        Очистить
                    </Button>
                </ButtonGroup>
                Список задач:
                <ListTask arrData={arrTaskList} onChangeData={arr => setArrTaskList(arr)}/>
                <Dialog title="Очистить" message="Уверены?" show={showModal} setShow={setShowModal}
                        onConfirm={() => setArrTaskList([])}
                        props={{className: 'modal-sm'}}/>
            </div>
        </div>
    );
}