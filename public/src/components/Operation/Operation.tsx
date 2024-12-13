import React, {useState} from 'react';
import './style.css';
import 'photoswipe/style.css';
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";
import ListTask from "../ListTask/ListTask";
import {Button} from "react-bootstrap";

export default function Operation({
                                      prompt, setPrompt, stateLoadGPT, onGPT,
                                      stateImageLoad, onRequestImages,
                                      stateLoadText2Speech, toSpeech,
                                      onBuild, stateNewsBuild,
                                      refAudio,
                                      news
                                  }) {

    const [arrTaskList, setArrTaskList] = useState([{id: 0, title: 'aaa'}, {id: 0, title: 'bbb'}, {
        id: 0,
        title: 'ccc'
    }]);

    return (
        <div className="operation d-flex flex-column h-100">
            <div className="d-flex flex-row">
                <textarea className="form-control me-1 operation__prompt"
                          value={prompt}
                          onChange={e => setPrompt(e.target.value)}/>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadGPT}
                               onClick={onGPT}>GPT</ButtonSpinner>
            </div>
            <div className="d-flex flex-column">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateImageLoad}
                               onClick={onRequestImages}>Изображение</ButtonSpinner>
            </div>
            <div className="d-flex flex-column align-arrItem-center justify-content-between">
                <ListTask arrData={arrTaskList} onChangeData={arr => setArrTaskList(arr)}/>
                <Button variant="secondary btn-sm my-1" onClick={() => {
                    const {id, title} = news;
                    !arrTaskList.find(({id}) => id === news.id) && setArrTaskList([...arrTaskList, news]);
                }}>Добавить</Button>
            </div>
            <div className="d-flex flex-row align-arrItem-center justify-content-between">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadText2Speech}
                               onClick={toSpeech}>Озвучить</ButtonSpinner>
                <audio controls ref={refAudio} style={{height: '2em'}}>
                    <source type="audio/mpeg"/>
                </audio>
            </div>
            <div className="d-flex flex-column">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateNewsBuild}
                               onClick={onBuild}>Собрать</ButtonSpinner>
            </div>
        </div>
    );
}