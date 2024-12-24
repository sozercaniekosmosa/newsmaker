import React, {useEffect, useState} from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import './style.css'
import {Button} from "react-bootstrap";
import Dialog from "../../../Dialog/Dialog.tsx";
import axios from "axios";
import globals from "globals";
import glob from "../../../../../global.ts";

export default function Gallery(props) {
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    useEffect(() => {
        let lightbox = new PhotoSwipeLightbox({
            gallery: '#' + props.galleryID,
            children: 'a',
            pswpModule: () => import('photoswipe'),
        });
        lightbox.init();

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
                <div style={{width: 'fit-content'}}>
                    <Button variant="danger btn-sm py-0 px-0"
                            style={{position: "relative", lineHeight: '0', height: '22px', width: '22px', left: '30px', top: '-32px'}}
                            onClick={(e) => {
                                setShowModal(true);
                                setItemToDelete(image.src)
                            }}
                    >X</Button>
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
            <Dialog title="Удалить изображение" message="Уверены?" show={showModal} setShow={setShowModal}
                    onConfirm={onConfirmRemoveImage}
                    props={{className: 'modal-sm'}}/>
        </div>
    );
}