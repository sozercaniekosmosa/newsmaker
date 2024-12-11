import React from 'react';
import PropTypes from 'prop-types';
import './style.css';

const Progressbar = ({progress}) => {
    return (
        <div className="progress-bar-container">
            <div className="progress-bar" style={{width: `${progress}%`}}>
                {/*{progress}%*/}
            </div>
        </div>
    );
};

Progressbar.propTypes = {
    progress: PropTypes.number.isRequired,
};

export default Progressbar;