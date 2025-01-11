import ButtonSpinner from "../../../ButtonSpinner/ButtonSpinner";
import React, {useState} from "react";
import {getSelelected, insertAt} from "../../../../../utils";
import axios from "axios";
import {getNameAndDate} from "../../../../utils";
import globals from "globals";
import {Button, ButtonGroup} from "react-bootstrap";
import glob from "../../../../../global.ts";

export default function GPT({news, textGPT, setTextGPT, listHostToData, addText, setAddText}) {
    const [prompt, setPrompt] = useState('Выдели основные мысли и сократи текст до 30 слов')

    const [stateLoadYaGPT, setStateLoadYaGPT] = useState(0)
    const [stateLoadArliGPT, setStateLoadArliGPT] = useState(0)
    const [stateLoadMistralGPT, setStateLoadMistralGPT] = useState(0)

    async function onGPT(type: string, promptCmd = null) {
        type === 'yandex' && setStateLoadYaGPT(1)
        type === 'arli' && setStateLoadArliGPT(1)
        type === 'mistral' && setStateLoadMistralGPT(1)
        try {
            let nodeNewsTextContainer = document.querySelector('.news-text');

            const textContent = glob.selectedText ?? nodeNewsTextContainer.textContent;

            const {data: text} = await axios.post(glob.host + 'gpt', {type, text: textContent, prompt: promptCmd ?? prompt});

            if (promptCmd) {
                setTextGPT(textGPT.replace(textContent, text))
            } else {
                if (text.toLocaleLowerCase().includes('в интернете есть много сайтов с информацией на эту')) throw 'ошибка';
                setTextGPT(textGPT + text + '\n\n');
            }
            //сохранить в файл
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


    return <div className="d-flex flex-column w-100 flex-stretch" style={{position: 'relative'}}>
        <ButtonGroup>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Выдели основные мысли и сократи текст до 30 слов')}>Обобщение</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Перефразируй')}>Перефразируй</Button>
            <Button variant="secondary btn-sm" onClick={() => onGPT('mistral', 'число в текст')}>Переведи число в текст</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('Сократи текст в два раза')}>Сократи х2</Button>
            <Button variant="secondary btn-sm" onClick={() => setPrompt('перевод на английский')}>На английский</Button>
        </ButtonGroup>
        <textarea className="form-control me-1 operation__prompt rounded border mb-1 px-2" value={prompt} style={{height: '30px'}}
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
        <input type="text" value={addText} onChange={({target}) => setAddText(target.value)} className="rounded border my-1  px-2"
               placeholder="Дополнительный текст для особых отметок (верний левый угол видео)"/>
        <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={textGPT || ''}
                  onChange={({target}) => setTextGPT(target.value)}/>
        <div style={{position: 'absolute', bottom: '6px', left: '6px', opacity: .5}}>Слов: {(textGPT.match(/ /g) || []).length}</div>
    </div>
}