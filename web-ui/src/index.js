import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom'
import App from './App';
import Party from './Party';

ReactDOM.render(
  <Router>
    <Route exact path="/">
      <Redirect to="/home" />
    </Route>
    <Route exact path="/party/:id" component={Party} />
    <Route exact path="/home" component={App} />
    <Route exact path="/home/:market" component={App} />
    <Route exact path="/home/:market/:tab" component={App} />
  </Router>,
  document.getElementById('root')
);
