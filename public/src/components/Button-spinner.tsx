import {useEffect, useRef, useState} from 'react'
import './style.css'
import {Pane, ResizablePanes} from "resizable-panes-react";
import axios from "axios";
import {addDay, formatDateTime, getID, toShortString} from "../utils";
import iconTG from "../assets/tg.svg";
import {Accordion} from "react-bootstrap";

//0-ok, 1-processing, 2-error
export default function ({state, className, onClick, children}) {
    return (
        <button className={className + ' btn'} onClick={onClick} disabled={state == 1}
                style={{outline: state == 2 ? '1px solid #cc0000' : 'none'}}>
            <span className="spinner-border spinner-border-sm" style={{width: '.9em', height: '.9em',}} hidden={state != 1}/>
            {children}
        </button>)
}
