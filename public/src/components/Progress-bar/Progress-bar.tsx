import React from 'react';
import PropTypes from 'prop-types';
import './style.css';

const ProgressBar = ({progress}) => {
    return (
        <div className="progress-bar-container">
            <div className="progress-bar" style={{width: `${progress}%`}}>
                {/*{progress}%*/}
            </div>
        </div>
    );
};

ProgressBar.propTypes = {
    progress: PropTypes.number.isRequired,
};

export default ProgressBar;