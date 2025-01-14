//0-ok, 1-processing, 2-error
export default function ({state, className = '', onClick, children, style = {}, disabled = false, hidden = false}) {
    return (
        <button className={className + ' btn'} onClick={onClick} disabled={state == 1 || disabled} hidden={hidden}
                style={{outline: state == 2 ? '1px solid #cc0000' : 'none', ...style}}>
            <span className="spinner-border spinner-border-sm" style={{width: '.9em', height: '.9em', zIndex: 9999, position: 'absolute'}}
                  hidden={state != 1}/>
            {children}
        </button>)
}
