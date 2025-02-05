import React, {useEffect, useState} from "react";
import ButtonSpinner from "../../../Auxiliary/ButtonSpinner/ButtonSpinner";
import Gallery from "../Gallery/Gallery";
import axios from "axios";
import global from "../../../../../global.ts";
import glob from "../../../../../global.ts";
import {extractDimensionsFromUrl, toGPT} from "../../../../utils.ts";
import DraggableList from "../../../Auxiliary/DraggableList/DraggableList.tsx";
import {ButtonGroup} from "react-bootstrap";
import Select from "../../../Auxiliary/Select/Select.tsx";
import {eventBus} from "../../../../../utils.ts";
import {ListButton} from "../../../Auxiliary/ListButton/ListButton.tsx";

function arrMoveItem(arr, fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
        throw new Error('Индексы выходят за пределы массива');
    }

    // Извлекаем элемент из старого индекса
    const element = arr.splice(fromIndex, 1)[0];

    // Вставляем элемент на новый индекс
    arr.splice(toIndex, 0, element);

    return arr;
}

const listInATime = {'Прямо сейчас': 0, '+ 1 мин': 60e3, '+ 15 мин': 15 * 60e3, '+ 30 мин': 30 * 60e3,};

const getLocalImage = async (id, setArrImg): Promise<void> => {
    try {
        const {data: arrSrc} = await axios.get(glob.hostAPI + 'local-image-src-tg', {params: {id}});

        setArrImg(arrSrc.map((srcUrl: string) => {
            return {src: srcUrl + '?' + new Date().getTime(), ...extractDimensionsFromUrl(srcUrl)};
        }))
    } catch (e) {
        // setArrImg([])
    }
}

let currID;
export default function Telegram({news, setNews, typeServiceGPT}) {
    const [arrImgTg, setArrImgTg] = useState([])
    const [quantity, setQuantity] = useState(5);
    const [timeout, setTimeout] = useState(3);
    const [timePublic, setTimePublic] = useState(15 * 60e3)
    const [update, setUpdate] = useState((new Date()).getTime())

    const [type, setType] = useState('mistral');

    useEffect(() => {
        eventBus.addEventListener('message-socket', ({type}) => {
            if (type === 'update-news') {
                setUpdate((new Date()).getTime());
            }
        })
    }, [])

    useEffect(() => {
        if (!news) return
        (() => getLocalImage(news.id, setArrImgTg))();
    }, [update])

    useEffect(() => {
        if (!news) return;
        (() => getLocalImage(news.id, setArrImgTg))();

        if (currID == news?.id) return;
        currID = news.id;


        setArrImgTg([]);
    }, [news])

    const onGPT = async (name, promptCmd: string, isTotal = false) => {
        let textContent: any = isTotal ? news.text : (global.selectedText ?? news.text.trim());

        const text = await toGPT(typeServiceGPT, promptCmd, textContent);

        let textGPT = news.textTg ? news.textTg?.replace(textContent, text) : (news.textTg ?? '') + text + '\n\n';
        setNews({...news, textTg: !news.textTg.length ? `${news.title}.\n\n${textGPT}` : textGPT})

        return text ? 0 : 2
    };

    async function reqImg({quant}) {
        try {
            const {id, tags} = news;

            const selectedText = global.selectedText;
            const prompt = selectedText ?? tags;

            const {data: {arrUrl, id: respID}} = await axios.get(global.hostAPI + 'images-tg',
                {params: {prompt, max: quant ?? quantity, id, timeout: timeout * 1000}});

            if (currID !== +respID) return 0; //TODO: переделать
            setArrImgTg(arrUrl.map(src => ({src, width: undefined, height: undefined,})))
            return 0
        } catch (e) {
            console.log(e)
            return 2
        }
    }

    let onChangeSort = (nodeIndex, targetIndex) => {
        const _arr = arrMoveItem([...news.arrImgTg], nodeIndex, targetIndex)
        setNews({...news, arrImgTg: _arr});
    };

    function onRemoveImage(e) {
        const index = e.target.dataset.index;
        news.arrImgTg.splice(index, 1)
        setNews({...news, arrImgTg: news.arrImgTg});
        e.preventDefault()
    }

    const onDropSortImg = () => {
        if (!global.draggingElement) return;
        //@ts-ignore
        let src = (new URL(global.draggingElement.src)).pathname.split('/').at(-1) + '?' + new Date().getTime();
        setNews({...news, arrImgTg: [...news.arrImgTg, src]});
        global.draggingElement = null;
    }

    let onGetTagsGPT = async () => {
        const text = await toGPT('mistral', 'Выдели основные мысли, факты, персоны и на основе них сделай несколько не больше 5 тегов. Ни чего лишенего только ответ формата: тег, тег, тег', news?.text ?? '');
        setNews(now => ({...now, tags: text}));
        return text ? 0 : 2;
    };

    const onPrepareImgTitleNews = async (news, image) => {
        await axios.post(global.hostAPI + 'create-title-image', {
            id: news.id,
            url: image.src
        });
    };
    let onConfirmRemoveImage = async (src: string = null) => {
        try {
            const path = (src.includes('?')) ? src.split('?')[0] : src;
            await axios.get(global.hostAPI + 'remove-image', {params: {path}});
            setUpdate((new Date()).getTime())
        } catch (e) {
            console.log(e)
        }
    };

    const listGPTPromptButton = [
        ['Подготовь', 'Подготовь текст выдели основные мысли перед каждой мыслью поставь эмодзи подходящий по смыслу. Ответ дожен быть в виде требуемого без лишних слов', true],
        ['Перефразируй', 'Перефразируй', true],
        ['СИ', 'Переведи значения в соответствии с Российской системой мер. Ответь очень кратко в виде пересчитаного значения'],
        ['Аббр. название в текст', 'Все аббревиатуры и названия необходимо представить в виде слов учитывая форму произношения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов'],
        ['Число в текст', 'Все числа необходимо представить в виде слов учитывая форму произношения и единицы измерения в контексте текста. Ответ дожен быть в виде требуемого без лишних слов'],
        ['На английский', 'Переведи на английский. Ответ дожен быть в виде требуемого без лишних слов'],
    ]

    let onPublishMessage = async () => {
        try {
            await axios.post(global.hostAPI + 'tg-public-news', {
                id: news.id,
                inATime: timePublic,
                arrImg: news?.arrImgTg,
                text: news?.textTg,
            });
            return 0;
        } catch (e) {
            return 2;
        }
    };

    return (
        <div className="d-flex flex-column w-100 notranslate">
            <textarea className="options__tags d-flex flex-row border rounded mb-1 p-2 notranslate"
                      value={news?.tags || ''} style={{height: '5em'}}
                      onChange={({target}) => setNews(was => ({...was, tags: target.value}))}/>
            <div className="d-flex flex-row mb-1 gap-1 w-auto">
                <ButtonSpinner className="btn-secondary btn-sm text-truncate" onAction={onGetTagsGPT}>Получить
                    теги</ButtonSpinner>
                <div className={"d-flex gap-1 " + (news.tags.length ? '' : 'ev-none opacity-25')}>
                    <ListButton arrParam={[1, 2, 3, 5, 10, 15, 20, 25, 35, 40]} onAction={(n) => reqImg({quant: n})}/>
                    <input className="rounded border text-end ms-2 flex-stretch" type="range" value={timeout} min={1}
                           max={20} step={1} onChange={({target}) => setTimeout(+target.value)} title="Таймаут"/>
                    <span className="p-1 text-center" style={{width: '3.5em'}}>{timeout + ' сек'}</span>
                </div>
            </div>
            <div className="d-flex flex-column">

                <div className="operation__img border rounded mb-1" style={{backgroundColor: '#ebf0f7'}}>
                    <Gallery galleryID="my-test-gallery" images={arrImgTg} news={news}
                             onPrepareImgTitleNews={onPrepareImgTitleNews}
                             onConfirmRemoveImage={onConfirmRemoveImage}/>
                </div>

                <div className="border rounded mb-1 p-0"
                     style={{backgroundColor: '#ebf0f7', height: '110px', overflow: 'auto', resize: 'vertical'}}
                     onDrop={onDropSortImg}
                     onDragOver={e => e.preventDefault()}>
                    {news?.arrImgTg?.length === 0 && <div>
                        <center className="text-secondary opacity-50"><h6>Перетащите изображения из загруженых...</h6>
                        </center>
                    </div>}
                    <DraggableList onChange={onChangeSort}
                                   className="d-flex flex-wrap justify-content-center">
                        {news?.arrImgTg?.length > 0 && news?.arrImgTg.map((item, index) => {
                            return <img key={index} className="sortable sortable-img border m-1 rounded shadow-sm"
                                        draggable
                                        src={'/' + news.pathSrc + '/img/' + item}
                                        data-index={index}
                                        onContextMenu={(e) => onRemoveImage(e)}/>
                        })}
                    </DraggableList>
                </div>

            </div>
            <div className="d-flex flex-column w-100 flex-stretch" style={{position: 'relative'}}>
                <ListButton arrParam={listGPTPromptButton} onAction={onGPT}/>
                <div className="position-relative flex-stretch mb-1">
            <textarea className="flex-stretch no-resize border rounded mb-1 p-2 h-100 w-100" value={news.textTg || ''}
                      onChange={({target}) => setNews({...news, textTg: target.value})}/>
                    <div style={{position: 'absolute', bottom: '6px', left: '6px', opacity: .5}}>
                        Слов: {(news.textTg?.match(/ /g) || []).length}</div>
                </div>
                <div className="d-flex flex-row align-self-end gap-1 mb-1">
                    <Select arrList={listInATime} value={timePublic} onChange={(val) => setTimePublic(val)}
                            style={{width: '10em', height: '2em'}}
                            className="py-0"></Select>
                    {/*<input type="datetime-local" className="border rounded form-control" style={{width: '8em', height: '2em'}}/>*/}
                    <ButtonSpinner disabled={news?.textTg?.length == 0 || news?.arrImgTg?.length == 0}
                                   className="btn-secondary btn-sm"
                                   onAction={onPublishMessage}>Запланировать публикацию</ButtonSpinner>
                </div>
            </div>
        </div>)
}