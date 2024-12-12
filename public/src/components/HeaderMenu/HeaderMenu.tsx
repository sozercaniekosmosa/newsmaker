import React, {useEffect} from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import {Button, ButtonGroup} from "react-bootstrap";

export default function HeaderMenu({
                                       onSelectSrcNews, arrButtonSelect,
                                       stateNewsUpdate, onUpdateAllNews,
                                       dtFrom, setDtFrom, setDtTo, dtTo,
                                       onResetSelectedTag,
                                       filterTags
                                   }) {

    const [listPolitics, listScience, listCulture, listSport] = arrButtonSelect;

    return (<>
        <div className="type-filters" onClick={onSelectSrcNews}>
            <ButtonGroup>
                {Object.entries(listPolitics).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listScience).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listCulture).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
            <ButtonGroup>
                {Object.entries(listSport).map(([key, val], index) => {
                    return <Button key={index} variant="secondary btn-sm notranslate" data-type={key}>{val}</Button>;
                })}
            </ButtonGroup>
        </div>
        <div className="control-filters d-flex flex-row notranslate">
            <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateNewsUpdate} onClick={onUpdateAllNews}>
                Обновить
            </ButtonSpinner>
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}} value={dtFrom}
                   onChange={e => setDtFrom(e.target.value)}/>
            <input type="date" className="form-control" style={{width: '8em', height: '2em'}} value={dtTo}
                   onChange={e => setDtTo(e.target.value)}/>
            <div className="selected-filters" onClick={onResetSelectedTag}>{filterTags ? '#' + filterTags : ''}</div>
        </div>
    </>);
}