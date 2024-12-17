import React, {useEffect} from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import './style.css'

export default function Gallery(props) {
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

    return (
        <div className="pswp-gallery" id={props.galleryID}>
            {props.images.length===0&&<div><center>Пусто</center></div>}
            {props.images.map((image, index) => (
                <a href={image.src}
                   data-pswp-width={image.width}
                   data-pswp-height={image.height}
                   key={props.galleryID + '-' + index}
                   target="_blank"
                   rel="noreferrer"
                >
                    <img src={image.src} alt=""/>
                </a>
            ))}
        </div>
    );
}