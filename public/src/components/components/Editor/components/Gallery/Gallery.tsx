import React, {useEffect, useState} from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import './style.css'
import {Button} from "react-bootstrap";
import Dialog from "../../../Auxiliary/Dialog/Dialog.tsx";
import axios from "axios";
import global from "../../../../../global.ts";
import 'tui-image-editor/dist/tui-image-editor.css';
import ImageEditor from '@toast-ui/react-image-editor';
import {theme, locale_ru} from './cfgEditor';
import {formatDateTime} from "../../../../../utils.ts";

export default function Gallery({news, galleryID, images}) {
    const [showModalRemove, setShowModalRemove] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [srcToEdit, setSrcToEdit] = useState<number | null>(null);
    const [indexImage, setIndexImage] = useState<string | null>('');
    const [update, setUpdate] = useState((new Date()).getTime())

    useEffect(() => {
        let lightbox = new PhotoSwipeLightbox({
            gallery: '#' + galleryID,
            children: 'a',
            pswpModule: () => import('photoswipe'),
        });
        lightbox.init();

        // @ts-ignore
        window.saveAs = async (blob, namePath) => {

            try {
                const path = (namePath.includes('?')) ? namePath.split('?')[0] : namePath;

                const formData = new FormData();
                formData.append('image', blob);
                formData.append('path', path);

                await axios.post(global.hostAPI + 'save-image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })
                setShowModalEdit(false)
                setUpdate((new Date()).getTime());
            } catch (e) {
                console.log(e)
            }

            console.log(blob, namePath)
        }

        return () => {
            lightbox.destroy();
            lightbox = null;
        };
    }, []);

    let onConfirmRemoveImage = async (src: string = null) => {
        try {
            console.log(itemToDelete)
            const path = (src.includes('?')) ? src.split('?')[0] : src;
            await axios.get(global.hostAPI + 'remove-image', {params: {path}});
        } catch (e) {
            console.log(e)
        }
    };

    return (
        <div className="pswp-gallery d-flex flex-wrap justify-content-center" id={galleryID} style={{height: 0}}>
            {images.length === 0 && <div>
                <center className="text-secondary opacity-50"><h6>Загрузите изображения...</h6></center>
            </div>}
            {images.map((image, index) => (
                <div style={{width: 'fit-content'}} key={index}>
                    <div className="d-flex justify-content-between px-2" style={{position: "relative", top: '28px'}}>
                        <Button variant="danger btn-sm py-0 px-0"
                                style={{lineHeight: '0', height: '22px', width: '22px'}}
                                onClick={(e) => {
                                    setShowModalRemove(true);
                                    setItemToDelete(image.src)
                                }}
                        >X</Button>
                        <Button variant="secondary btn-sm py-0 px-0"
                                style={{lineHeight: '0', height: '22px', width: '22px'}}
                                onClick={async (e) => {
                                    await axios.post(global.hostAPI + 'create-title-image', {
                                        id: news.id,
                                        url: image.src
                                    });
                                }}
                        >+</Button>
                        <Button variant="secondary btn-sm py-0 px-0"
                                style={{lineHeight: '0', height: '22px', width: '22px'}}
                                onClick={(e) => {
                                    setShowModalEdit(true);
                                    setSrcToEdit(image.src)
                                    setIndexImage(index)
                                    console.log(srcToEdit)
                                }}
                        >…</Button>
                    </div>
                    <a href={image.src}
                       data-pswp-width={image.width}
                       data-pswp-height={image.height}
                       key={galleryID + '-' + index}
                       target="_blank"
                       rel="noreferrer"
                    >
                        <img src={'/' + image.src + '?' + update + new Date().getTime()} alt=""
                             onDragStart={e => global.draggingElement = e.target}
                             onContextMenu={(e) => {
                                 onConfirmRemoveImage(image.src);
                                 e.preventDefault();
                             }} className="shadow-sm"/>
                    </a>
                </div>

            ))}
            <Dialog title="Удалить изображение" message="Уверены?" show={showModalRemove} setShow={setShowModalRemove}
                    onConfirm={onConfirmRemoveImage}
                    props={{className: 'modal-sm'}}/>
            <Dialog title="Редактировать изображение" show={showModalEdit} setShow={setShowModalEdit}
                    props={{className: 'modal-lg', fullscreen: true}}>
                <ImageEditor
                    includeUI={{
                        loadImage: {
                            path: srcToEdit,
                            name: srcToEdit,
                        },
                        options: {
                            stroke: "#00ff08",
                            fill: "",
                            strokeWidth: 3
                        },
                        locale: locale_ru,
                        theme,
                        menu: ['shape', 'filter', 'icon', 'draw', 'flip', 'text'],
                        initMenu: 'shape',
                        uiSize: {
                            width: '100%',
                            height: '100%',
                        },
                        menuBarPosition: 'bottom',
                    }}
                    // cssMaxHeight={500}
                    // cssMaxWidth={700}
                    selectionStyle={{
                        cornerSize: 20,
                        rotatingPointOffset: 70,
                    }}
                    usageStatistics={false}
                />

            </Dialog>
        </div>
    );
}