//0-ok, 1-processing, 2-error
import React, {useEffect, useState} from "react";
import {Button} from "react-bootstrap";
import Dialog from "../Dialog/Dialog.tsx";

function ButtonSpinner({
                           style = {},
                           className = '',
                           onAction = null,
                           onClick = null,
                           disabled = false,
                           hidden = false,
                           variant = null,
                           children,
                           onConfirm = null
                       }) {
    const [_state, set_state] = useState(0)
    const [showAndDataEvent, setShowAndDataEvent] = useState<boolean | null | object>(false);


    let onAct = async (e) => {
        if (onConfirm) {
            setShowAndDataEvent(e)
            return e;
        }
        onClick && onClick(e)
        if (onAction) {
            set_state(1)
            const s = await onAction(e)
            setTimeout(() => set_state(s), 500);
        }
    }

    return <> {hidden ? '' : <Button variant={variant} className={className + ' d-flex justify-content-center align-items-center'}
                                     onClick={onAct} disabled={_state == 1 || disabled} hidden={hidden}
                                     style={{outline: _state == 2 ? '1px solid #cc0000' : 'none', ...style}}>
            <span className="spinner-border spinner-border-sm"
                  style={{width: '1.7em', height: '1.7em', zIndex: '9999', position: 'absolute', color: 'black'}}
                  hidden={_state != 1}/>
        {hidden ? '' : children}
    </Button>
    }
        {onConfirm ? <Dialog title="Удалить изображение" message="Уверены?" show={showAndDataEvent} setShow={setShowAndDataEvent}
                             onConfirm={async () => onConfirm(showAndDataEvent)}
                             props={{className: 'modal-sm'}}/> : ''}
    </>
}

export default ButtonSpinner;