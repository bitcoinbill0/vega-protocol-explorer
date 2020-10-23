import React from 'react';
import './App.css';

class Party extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }
  render() {
    return <div>This is a party {this.props.match.params.id}</div>
  }
}

export default Party;
