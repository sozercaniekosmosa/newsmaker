import React, {useEffect, useRef, useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner.tsx";
import ListTask from "./Components/ListTask/ListTask.tsx";
import {Button} from "react-bootstrap";
import {getNameAndDate, updateImageSizes} from "../../utils.ts";
import axios from "axios";
import {getSelelected, insertAt} from "../../../utils.ts";
import globals from "globals";

export default function Tools({news}) {

    const [arrTaskList, setArrTaskList] = useState([{id: 0, title: 'aaa'}, {id: 0, title: 'bbb'}, {
        id: 0,
        title: 'ccc'
    }]);


    return (
        <div className="operation d-flex flex-column h-100">
            <div className="d-flex flex-row">

            </div>

            <div className="d-flex flex-column align-arrItem-center justify-content-between">
                <ListTask arrData={arrTaskList} onChangeData={arr => setArrTaskList(arr)}/>
                <Button variant="secondary btn-sm my-1"
                        onClick={() => !arrTaskList.find(({id}) => id === news.id) && setArrTaskList([...arrTaskList, news])}>
                    Добавить
                </Button>
            </div>
        </div>
    );
}