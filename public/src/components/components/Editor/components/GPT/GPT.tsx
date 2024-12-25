import ButtonSpinner from "../../../ButtonSpinner/ButtonSpinner";
import React, {useState} from "react";
import {getSelelected, insertAt} from "../../../../../utils";
import axios from "axios";
import {getNameAndDate} from "../../../../utils";
import globals from "globals";
import {Button, ButtonGroup} from "react-bootstrap";
import glob from "../../../../../global.ts";

export default function GPT({news, textGPT, setTextGPT, listHostToData}) {
    const [prompt, setPrompt] = useState('Выдели основные мысли и сократи текст до 30 слов')

    const [stateLoadYaGPT, setStateLoadYaGPT] = useState(0)
    const [stateLoadArliGPT, setStateLoadArliGPT] = useState(0)
    const [stateLoadMistralGPT, setStateLoadMistralGPT] = useState(0)

    async function onGPT(type) {
        type === 'yandex' && setStateLoadYaGPT(1)
        type === 'arli' && setStateLoadArliGPT(1)
        type === 'mistral' && setStateLoadMistralGPT(1)
        try {
            let nodeNewsTextContainer = document.querySelector('.news-text');

            // const {selectedText, startPos, endPos} = getSelelected(nodeNewsTextContainer)
            const selectedText = glob.selectedText;
            const textContent = selectedText ?? nodeNewsTextContainer.textContent;

            const {data} = await axios.post(glob.host + 'gpt', {type, text: textContent, prompt});
            let text = data;

            // if (selectedText) {
            //     text = insertAt(nodeNewsTextContainer.textContent, '\n==>\n' + text + '\n<==\n', endPos)
            //     console.log(selectedText)
            // }

            setTextGPT(text)

            const {id, url, dt, title, titleEn} = news;
            const {date, name} = getNameAndDate(dt, url, id, listHostToData, titleEn);
            await axios.post(glob.host + 'save-text', {path: `news\\${date}\\${name}\\news.txt`, data: news.text});

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


    return <div className="d-flex flex-column w-100">
        <ButtonGroup>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Выдели основные мысли и сократи текст до 30 слов')}>Обобщение</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Перефразируй')}>Перефразируй</Button>
        </ButtonGroup>
        <textarea className="form-control me-1 operation__prompt rounded border mb-1" value={prompt}
                  onChange={e => setPrompt(e.target.value)}/>
        <div className="d-flex flex-row w-100 justify-content-end mb-1">
            <ButtonGroup>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadYaGPT}
                               onClick={() => onGPT('yandex')}>ya-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadArliGPT}
                               onClick={() => onGPT('arli')}>arli-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm" state={stateLoadMistralGPT}
                               onClick={() => onGPT('mistral')}>mistral-GPT</ButtonSpinner>
            </ButtonGroup>
        </div>
        <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={textGPT || ''}
                  onChange={({target}) => setTextGPT(target.value)}/>
    </div>
}