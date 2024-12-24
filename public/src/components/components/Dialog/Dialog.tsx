import {Button, Modal} from "react-bootstrap";

export default ({
                    show,
                    setShow,
                    title = 'Заголовок',
                    message = 'Сообщение',
                    onConfirm,
                    children = undefined,
                    onClose = undefined,
                    confirmName = 'Да',
                    props
                }) => {
    // const [show, setShow] = useState(true);

    const handleClose = () => {
        setShow(false);
        onClose && onClose()
    };

    return (<>
        <Modal show={show} onHide={handleClose} {...props} >
            <Modal.Header closeButton>
                <Modal.Title className="h6">{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-4">{children ? children : message}</Modal.Body>
            {onConfirm && <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} size="sm">Отмена</Button>
                <Button variant="danger" onClick={() => setShow(false) || onConfirm()} size="sm">{confirmName}</Button>
            </Modal.Footer>}
        </Modal>
    </>);
}