import React, {useEffect, useRef, useState} from "react";
import global from "../../../../../global.ts";
import glob from "../../../../../global.ts";
import {toGPT, updateMedia, updateNewsDB} from "../../../../utils.ts";
import {ButtonSeries, TArrParam, TOnAction} from "../../../Auxiliary/Groups/ButtonSeries/ButtonSeries.tsx";
import {Button} from "react-bootstrap";
import axios from "axios";
import Dialog from "../../../Auxiliary/Dialog/Dialog.tsx";
import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner.tsx";

let currID: string;

export default function Text({typeServiceGPT, news, setNews}) {

    const [speedDelta, setSpeedDelta] = useState(-.2);
    const [audioDur, setAudioDuration] = useState(0);
    const [showModalRemoveAnAudio, setShowModalRemoveAnAudio] = useState(false);
    const [arrHistory, setArrHistory] = useState<any>([]);

    const refAudio: React.MutableRefObject<HTMLAudioElement> = useRef();

    useEffect(() => {
        if (!news) return;

        updateNewsDB(news);

        if (currID === news.id) return;
        currID = news.id;

        (async () => await updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur'))();

    }, [news])

    const onGPT: TOnAction = async (name, promptCmd, isTotal = false) => {
        let textContent: any = isTotal ? news.text : (global.selectedText ?? news.text.trim());

        const text = await toGPT(typeServiceGPT, promptCmd, textContent);
        let textGPT = promptCmd && news.textGPT ? news.textGPT?.replace(textContent, text) : (news.textGPT ?? '') + text + '\n\n';
        if (arrHistory.at(-1) != news.textGPT) setArrHistory(arr => [...arr, news.textGPT]);
        setNews({...news, textGPT: !news?.textGPT?.length ? news.title + '.\n' + textGPT : textGPT});
        return text ? 0 : 2
    };

    const onRemoveAudio = async () => {

        try {
            await axios.get(global.hostAPI + 'remove-file', {params: {id: news.id, filename: 'speech.mp3'}});
            await axios.get(global.hostAPI + 'remove-file', {params: {id: news.id, filename: 'out.mp3'}});

            return 0;
        } catch (e) {
            console.log(e)
            return 2;
        } finally {
            setNews(now => ({...now, audioDur: 0}));
            await updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur')
        }
    }

    const arrPrompt: TArrParam = [
        ['50 слов', 'Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять около 50 слов', true],
        ['30 слов', 'Перепишите текст новости в понятной форме для широкой аудитории. Удалите технические термины и сложные обороты и по возможности аббревиатуры. Все диапазоны чисел необходимо представить типа: от 12 до 137 в виде: до 137 или 15-37 в виде: до 37. Структурируйте текст так, чтобы он начинался с предмета статьи и главной мысли, основную часть и в конце вывод. Объем текста должен составлять менее 30 слов.', true],
        ['Перефразируй', 'Перефразируй', false],
        ['СИ', 'Переведи значения в соответствии с Российской системой мер. Ответь очень кратко в виде пересчитаного значения', false],
        ['Аббр. название в текст', 'Все аббревиатуры и названия необходимо представить в виде слов учитывая форму произношения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов', false],
        ['Число в текст', 'Все числа необходимо представить в виде слов учитывая форму произношения и единицы измерения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов', false],
        ['На английский', 'Переведи на английский. Ответ дожен быть в виде требуемого без лишних слов', false],
    ]

    const listYA2SpeechButton = [
        ['Алёна', 'alena', 1.4 + speedDelta],
        ['Марина', 'marina', 1.5 + speedDelta],
        ['Омаж', 'omazh', 1.5 + speedDelta],
        ['Филипп', 'filipp', 1.4 + speedDelta]
    ];

    async function toYASpeech(name, voice: string, speed: number) {
        try {
            await axios.post(glob.hostAPI + 'to-speech', {
                id: news.id,
                text: glob.selectedText ?? news.textGPT,
                voice,
                speed
            });
            glob.selectedText = '';
            await updateMedia(refAudio.current, news.pathSrc + `/speech.mp3`, setNews, 'audioDur')

            return 0;
        } catch (e) {
            return 2;
        }
    }

    const onChangeMainText = ({target}) => {
        if (arrHistory.at(-1) != news.textGPT) setArrHistory(arr => [...arr, news.textGPT]);
        return setNews({...news, textGPT: target.value});
    };

    const onUndo = () => {
        setArrHistory((arr) => {
            const textGPT = arr.pop();
            setNews(news => ({...news, textGPT}))
            return arr;
        })
    };

    return <div className="d-flex flex-column flex-stretch w-100" style={{position: 'relative'}}>
        <div className="w-100" style={{position: 'relative'}}>
                            <textarea className="news-text border rounded mb-1 p-2 w-100" value={news?.text || ''}
                                      onChange={({target}) => setNews(was => ({...was, text: target.value}))}
                                      style={{height: '15em'}}/>
            <div style={{
                position: 'absolute', bottom: '10px', left: '6px', opacity: '0.7',
                backgroundColor: '#ffffff'
            }}>
                Слов: {(news?.text.match(/ /g) || []).length}</div>
        </div>
        <hr/>

        <div className="d-flex flex-column flex-stretch" style={{position: 'relative'}}>
            <div className="d-flex flex-row justify-content-between">
                <ButtonSeries arrParam={arrPrompt} onAction={onGPT}/>
                <ButtonSpinner className="btn-sm btn-secondary" onClick={onUndo}>Отмена</ButtonSpinner>
            </div>
            <input type="text" value={news.textAdd ?? ''}
                   onChange={({target}) => setNews({...news, textAdd: target.value})}
                   className="rounded border my-1  px-2"
                   placeholder="Дополнительный текст для особых отметок (верний левый угол видео)"/>
            <textarea className="flex-stretch no-resize border rounded mb-1 p-2" value={news.textGPT || ''}
                      onChange={onChangeMainText}/>
            <div style={{position: 'absolute', bottom: '6px', left: '6px', opacity: .5}}>
                Слов: {(news.textGPT?.match(/ /g) || []).length}</div>
        </div>
        <hr/>
        <div className="d-flex flex-column w-100">
            <div className="d-flex flex-row mb-2">
                <ButtonSeries arrParam={listYA2SpeechButton} onAction={toYASpeech}/>
                <input className="rounded border text-end ms-1" type="range" value={speedDelta}
                       min={-1} max={1}
                       step={0.1} onChange={({target}) => setSpeedDelta(+target.value)}
                       title="Скорость"/>
                <span className="p-1 text-center" style={{width: '3em'}}>{speedDelta}</span>
            </div>
            <div className="d-flex mb-1">
                <audio controls ref={refAudio} className="w-100" style={{height: '2em'}}
                       onDurationChange={(e) => {
                           setAudioDuration(~~(e.target as HTMLAudioElement).duration)
                       }}>
                    <source type="audio/mpeg"/>
                </audio>
                <Button variant="secondary btn-sm p-0 ms-1"
                        style={{height: '27px', width: '27px', flex: 'none'}}
                        onClick={() => setShowModalRemoveAnAudio(true)}>X</Button>
            </div>
        </div>
        <Dialog title="Удалить эелемент" message="Уверены?" show={showModalRemoveAnAudio}
                setShow={setShowModalRemoveAnAudio}
                onConfirm={onRemoveAudio} props={{className: 'modal-sm'}}/>
    </div>


}