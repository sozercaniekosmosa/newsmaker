import React from 'react';
import 'photoswipe/style.css';
import {formatDateTime} from "../../utils";
import ButtonSpinner from "../ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";

export default function Operation({
                                      prompt, setPrompt, stateLoadGPT, onGPT,
                                      arrImg, stateImageLoad, requestImages,
                                      stateLoadText2Speech, toSpeech,
                                      onBuild, stateNewsBuild,
                                      refAudio
                                  }) {
    return (
        <>
            <div className="d-flex flex-row" style={{margin: '.3em 0'}}>
                <input type="text" className="form-control me-1 options__prompt"
                       style={{width: '40em'}}
                       value={prompt}
                       onChange={e => setPrompt(e.target.value)}/>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadGPT}
                               onClick={onGPT}>Обработать GPT</ButtonSpinner>
            </div>
            <div className="options__img">
                <Gallery galleryID="my-test-gallery" images={arrImg}/>
            </div>
            <div className="options__control d-flex flex-row align-items-center">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateImageLoad}
                               onClick={requestImages}>Изображение</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadText2Speech}
                               onClick={toSpeech}>Озвучить</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateNewsBuild}
                               onClick={onBuild}>Собрать</ButtonSpinner>
                <audio controls ref={refAudio}
                       style={{height: '1em', display: 'flex', alignItems: 'center'}}>
                    <source type="audio/mpeg"/>
                </audio>
            </div>
        </>
    );
}