import React, {useEffect, useState} from 'react';
import {Button, ListGroup, Modal} from 'react-bootstrap';
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';

const ListComponent = ({arrData, onChangeData}) => {
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);


    const handleDelete = (index) => {
        setItemToDelete(index);
        setShowModal(true);
    };

    const confirmDelete = () => {
        if (itemToDelete !== null) {
            arrData.splice(itemToDelete, 1)
            onChangeData && onChangeData(arrData);
            setShowModal(false);
            setItemToDelete(null);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setItemToDelete(null);
    };

    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }
        const reorderedItems = Array.from(arrData as []);
        const [movedItem] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, movedItem);
        onChangeData && onChangeData(reorderedItems);
        console.log(reorderedItems)
    };

    return (
        <div className="container px-0">
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="droppable">
                    {(provided) => (
                        <ListGroup{...provided.droppableProps} ref={provided.innerRef}>
                            {arrData.map(({title, id}, index) => (
                                <Draggable key={index} draggableId={`item-${index}`} index={index}>
                                    {(provided) => (
                                        <ListGroup.Item
                                            ref={provided.innerRef}{...provided.draggableProps}{...provided.dragHandleProps}
                                            className="d-flex justify-content-between align-items-center px-2 py-2 m-0"
                                        >
                                            {title}
                                            <Button variant="secondary btn-sm" onClick={() => handleDelete(index)}>
                                                X
                                            </Button>
                                        </ListGroup.Item>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </ListGroup>
                    )}
                </Droppable>
            </DragDropContext>

            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Удаление</Modal.Title>
                </Modal.Header>
                <Modal.Body>Уверены?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Отмена
                    </Button>
                    <Button variant="danger" onClick={confirmDelete}>
                        Удалить
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ListComponent;