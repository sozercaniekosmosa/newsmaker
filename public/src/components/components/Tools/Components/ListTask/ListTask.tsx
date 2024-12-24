import React, {useState} from 'react';
import {Button, ListGroup} from 'react-bootstrap';
import {DragDropContext, Draggable, Droppable} from 'react-beautiful-dnd';
import './style.css'
import Dialog from "../../../Dialog/Dialog";

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
                            {!arrData.length && (<center>Пусто</center>)}
                            {arrData.map(({title, id}, index) => (
                                <Draggable key={index} draggableId={`item-${index}`} index={index}>
                                    {provided => (
                                        <ListGroup.Item
                                            ref={provided.innerRef}{...provided.draggableProps}{...provided.dragHandleProps}
                                            className="d-flex justify-content-between align-items-center px-1 py-1 m-0">
                                            <div className="text-truncate pe-1" title={title}>{title}</div>
                                            <Button variant="secondary btn-sm p-0" style={{height:'27px', width:'27px', flex:'none'}}
                                                    onClick={() => handleDelete(index)}>X</Button>
                                        </ListGroup.Item>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </ListGroup>
                    )}
                </Droppable>
            </DragDropContext>

            <Dialog title="Удалить" message="Уверены?" show={showModal} setShow={setShowModal} onConfirm={confirmDelete}
                    props={{className: 'modal-sm'}} children={undefined} onClose={undefined}/>
        </div>
    );
};

export default ListComponent;