//0-ok, 1-processing, 2-error
import React, {useEffect, useState} from "react";
import {Button} from "react-bootstrap";

function ButtonSpinner({
                           style = {},
                           // state = 0,
                           className = '',
                           onAction = null,
                           onClick = null,
                           disabled = false,
                           hidden = false,
                           variant = null,
                           children,
                       }) {
    const [_state, set_state] = useState(0)
    // useEffect(() => {
    //     set_state(state)
    // }, []);
    return (
        hidden ? '' : <Button variant={variant} className={className + ' d-flex justify-content-center align-items-center'}
                onClick={async (e) => {
                    onClick && onClick(e)
                    if (onAction) {
                        set_state(1)
                        const s = await onAction(e)
                        setTimeout(() => set_state(s), 500);
                    }
                }} disabled={_state == 1 || disabled} hidden={hidden}
                style={{outline: _state == 2 ? '1px solid #cc0000' : 'none', ...style}}>
            <span className="spinner-border spinner-border-sm"
                  style={{width: '1.7em', height: '1.7em', zIndex: '9999', position: 'absolute', color: 'black'}}
                  hidden={_state != 1}/>
            {hidden ? '' : children}
        </Button>)
}

export default ButtonSpinner;