import React, {useEffect, useState} from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import './style.css'
import {Button} from "react-bootstrap";
import Dialog from "../../../Dialog/Dialog.tsx";
import axios from "axios";
import glob from "../../../../../global.ts";
import 'tui-image-editor/dist/tui-image-editor.css';
import ImageEditor from '@toast-ui/react-image-editor';
import {theme, locale_ru} from './cfgEditor';

export default function Gallery(props) {
    const [showModalRemove, setShowModalRemove] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [srcToEdit, setSrcToEdit] = useState<number | null>(null);
    const [indexImage, setIndexImage] = useState<string | null>('');

    useEffect(() => {
        let lightbox = new PhotoSwipeLightbox({
            gallery: '#' + props.galleryID,
            children: 'a',
            pswpModule: () => import('photoswipe'),
        });
        lightbox.init();

        // @ts-ignore
        window.saveAs = async (blob, namePath) => {

            try {
                const formData = new FormData();
                formData.append('image', blob);
                formData.append('path', namePath);

                await axios.post(glob.host + 'save-image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })
                setShowModalEdit(false)
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

    let onConfirmRemoveImage = async () => {
        console.log(itemToDelete)
        await axios.get(glob.host + 'images-remove', {params: {path: itemToDelete}});
    };

    return (
        <div className="pswp-gallery d-flex flex-wrap justify-content-center" id={props.galleryID}>
            {props.images.length === 0 && <div>
                <center>Пусто</center>
            </div>}
            {props.images.map((image, index) => (
                <div style={{width: 'fit-content'}} key={index}>
                    <Button variant="danger btn-sm py-0 px-0"
                            style={{position: "relative", lineHeight: '0', height: '22px', width: '22px', left: '52px', top: '-32px'}}
                            onClick={(e) => {
                                setShowModalRemove(true);
                                setItemToDelete(image.src)
                            }}
                    >X</Button>
                    <Button variant="secondary btn-sm py-0 px-0"
                            style={{position: "relative", lineHeight: '0', height: '22px', width: '22px', left: '175px', top: '-32px'}}
                            onClick={(e) => {
                                setShowModalEdit(true);
                                setSrcToEdit(image.src)
                                setIndexImage(index)
                                console.log(srcToEdit)
                            }}
                    >…</Button>
                    <a href={image.src}
                       data-pswp-width={image.width}
                       data-pswp-height={image.height}
                       key={props.galleryID + '-' + index}
                       target="_blank"
                       rel="noreferrer"
                    >
                        <img src={image.src} alt=""/>
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
                        locale: locale_ru,
                        theme,
                        menu: ['shape', 'filter', 'icon'],
                        initMenu: 'filter',
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