//0-ok, 1-processing, 2-error
import React, {useEffect, useState} from "react";
import {Button} from "react-bootstrap";

export default function ({
                             state = 0,
                             className = '',
                             onAction = null,
                             onClick = null,
                             children,
                             style = {},
                             disabled = false,
                             hidden = false,
                             variant = null
                         }) {
    const [_state, set_state] = useState(0)
    useEffect(() => {
        set_state(state)
    }, []);
    return (
        <Button variant={variant} className={className + ' btn'}
                onClick={async (e) => {
                    onClick && onClick(e)
                    if (onAction) {
                        debugger
                        set_state(1)
                        const s = await onAction(e)
                        set_state(s);
                    }
                }} disabled={_state == 1 || disabled} hidden={hidden}
                style={{outline: _state == 2 ? '1px solid #cc0000' : 'none', ...style}}>
            <span className="spinner-border spinner-border-sm"
                  style={{width: '.9em', height: '.9em', zIndex: 9999, position: 'absolute'}}
                  hidden={_state != 1}/>
            {children}
        </Button>)
}
