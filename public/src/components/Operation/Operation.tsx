import React from 'react';
import './style.css';
import 'photoswipe/style.css';
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
        <div className="operation d-flex flex-column h-100">
            <div className="d-flex flex-row">
                <textarea className="form-control me-1 operation__prompt"
                          style={{width: '40em'}}
                          value={prompt}
                          onChange={e => setPrompt(e.target.value)}/>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadGPT} onClick={onGPT}>GPT</ButtonSpinner>
            </div>
            <div className="operation__img">
                <Gallery galleryID="my-test-gallery" images={arrImg}/>
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateImageLoad}
                               onClick={requestImages}>Изображение</ButtonSpinner>
            </div>
            <div className="d-flex flex-row align-items-center justify-content-between">
                <ButtonSpinner className="btn-secondary btn-sm notranslate" state={stateLoadText2Speech}
                               onClick={toSpeech}>Озвучить</ButtonSpinner>
                <audio controls ref={refAudio}
                       style={{height: '1em', display: 'flex', alignItems: 'center'}}>
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