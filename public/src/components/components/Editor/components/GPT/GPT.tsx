import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner";
import React, {useState} from "react";

import {Button, ButtonGroup} from "react-bootstrap";
import global from "../../../../../global.ts";
import {toGPT} from "../../../../utils.ts";

const defaultPrompt = 'Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 50 слов';

export default function GPT({news, setNews}) {
    const [prompt, setPrompt] = useState(defaultPrompt)

    const [stateLoadGPT, setStateLoadGPT] = useState({type: '', state: 0});

    const onGPT = async (type: string, promptCmd = null) => {
        let textContent = (global.selectedText ?? document.querySelector('.news-text').textContent.trim());
        const text = await toGPT(type, promptCmd ?? prompt, textContent, setStateLoadGPT);
        let textGPT = promptCmd ? news.textGPT?.replace(textContent, text) : (news.textGPT ?? '') + text + '\n\n';
        setNews({...news, textGPT})
    }

    return <div className="d-flex flex-column w-100 flex-stretch" style={{position: 'relative'}}>
        <ButtonGroup>
            <Button variant="secondary btn-sm"
                    onClick={() => setPrompt(defaultPrompt)}>
                50 слов</Button>
            <Button variant="secondary btn-sm"
                    onClick={() => setPrompt('Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 30 слов')}>
                30 слов</Button>
            <Button variant="secondary btn-sm" onClick={() => onGPT(
                'mistral',
                'Округли числа до ближайшего целого. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37')}>Перефразируй</Button>
                        <Button variant="secondary btn-sm" onClick={() => onGPT(
                'mistral',
                'Переведи значения в соответствии с Российской системой мер. Ответь очень кратко в виде пересчитаного значения')}>СИ</Button>
            <Button variant="secondary btn-sm" onClick={() => onGPT(
                'mistral',
                'Все аббревиатуры необходимо представить в виде слов учитывая форму произношения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов')}>
                Аббр. в текст</Button>
            <Button variant="secondary btn-sm" onClick={() => onGPT(
                'mistral',
                'Все числа необходимо представить в виде слов учитывая форму произношения и единицы измерения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов')}>
                Число в текст</Button>
            <Button variant="secondary btn-sm" onClick={() => onGPT(
                'mistral',
                'Переведи на английский. Ответ дожен быть в виде требуемого без лишних слов')
            }>На английский</Button>
        </ButtonGroup>
        <textarea className="form-control me-1 operation__prompt rounded border mb-1 px-2" value={prompt}
                  style={{height: '30px'}}
                  onChange={e => setPrompt(e.target.value)}/>
        <div className="d-flex flex-row w-100 justify-content-end mb-1">
            <ButtonGroup>
                <ButtonSpinner className="btn-secondary btn-sm"
                               state={stateLoadGPT.type == 'yandex' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('yandex')}>ya-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm"
                               state={stateLoadGPT.type == 'arli' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('arli')}>arli-GPT</ButtonSpinner>
                <ButtonSpinner className="btn-secondary btn-sm"
                               state={stateLoadGPT.type == 'mistral' ? stateLoadGPT.state : 0}
                               onClick={() => onGPT('mistral')}>mistral-GPT</ButtonSpinner>
            </ButtonGroup>
        </div>
        <input type="text" value={news.textAdd ?? ''} onChange={({target}) => setNews({...news, textAdd: target.value})}
               className="rounded border my-1  px-2"
               placeholder="Дополнительный текст для особых отметок (верний левый угол видео)"/>
        <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={news.textGPT || ''}
                  onChange={({target}) => setNews({...news, textGPT: target.value})}/>
        <div style={{
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            opacity: .5
        }}>Слов: {(news.textGPT?.match(/ /g) || []).length}</div>
    </div>
}