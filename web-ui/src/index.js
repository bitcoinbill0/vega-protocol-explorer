import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom'
import App from './App';
import Party from './Party';

ReactDOM.render(
  <Router>
    <Route exact path="/" component={App} />
    <Route exact path="/party/:id" component={Party} />
  </Router>,
  document.getElementById('root')
);
