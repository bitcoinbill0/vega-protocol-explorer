import React from 'react';
import './App.css';
import {
  XYPlot,
  XAxis,
  YAxis,
  LineSeries,
  HorizontalGridLines,
  VerticalGridLines,
  ChartLabel
} from 'react-vis';
import loading from './loading.gif';
import moment from 'moment';

class Party extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      party: [],
      openVolume: [],
      unrealisedPNL: [],
      realisedPNL: [],
      activeData: [],
      baseUri: "localhost",
      market: null,
      selectedData: "openVolume"
    };
  }
  fetchParty() {
    fetch("http://" + this.state.baseUri + ":5000/party?party_id=" + this.props.match.params.id)
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({party: result['history'], orders: result['orders']}, () => {
            this.buildPartyPlot();
          });
        },
        (error) => {
          console.error(error);
        }
      );
  }
  buildPartyPlot() {
    const openVolume = [];
    const unrealisedPNL = [];
    const realisedPNL = [];
    let market = null;
    this.state.party.forEach(item => {
      market = item["party"]["positions"][0]["market"]["name"]
      openVolume.push({
        x: new Date(item["time"].split(".")[0]),
        y: item["party"]["positions"][0]["openVolume"]
      });
      unrealisedPNL.push({
        x: new Date(item["time"].split(".")[0]),
        y: Math.round(item["party"]["positions"][0]["unrealisedPNL"] / (10 ** item["party"]["positions"][0]["margins"][0]["asset"]["decimals"]))
      });
      realisedPNL.push({
        x: new Date(item["time"].split(".")[0]),
        y: Math.round(item["party"]["positions"][0]["realisedPNL"] / (10 ** item["party"]["positions"][0]["margins"][0]["asset"]["decimals"]))
      });
    });
    console.log(openVolume);
    this.setState({ openVolume, unrealisedPNL, realisedPNL, market }, () => {
      if(this.state.selectedData === "openVolume") {
        this.setState({activeData: openVolume});
      } else if(this.state.selectedData === "realisedPNL") {
        this.setState({activeData: realisedPNL});
      } else if(this.state.selectedData === "unrealisedPNL") {
        this.setState({activeData: unrealisedPNL});
      }
    });
  }
  componentDidMount() {
    this.timer = setInterval(() => this.fetchParty(), 1000);
  }
  componentWillUnmount() {
    this.timer = null;
  }
  onChangePlot(event) {
    const selectedData = event.target.value;
    if(selectedData === "openVolume") {
      this.setState({selectedData: event.target.value, activeData: this.state.openVolume});
    } else if(selectedData === "realisedPNL") {
      this.setState({selectedData: event.target.value, activeData: this.state.realisedPNL});
    } else if(selectedData === "unrealisedPNL") {
      this.setState({selectedData: event.target.value, activeData: this.state.unrealisedPNL});
    }
  }
  renderSide(side) {
    if(side === "Buy") {
      return <span className="long-label">{side}</span>
    } else {
      return <span className="short-label">{side}</span>
    }
  }
  render() {
    return (
      <div className="wrapper">
        <h1>Vega :: Markets Explorer</h1>
        <p>Selected party: <strong>{this.props.match.params.id}</strong></p>
        <hr />
        {this.state.activeData.length > 0 ?
          <div>
            <h2>Activity: {this.state.market}</h2>
            <div onChange={this.onChangePlot.bind(this)} style={{marginBottom:20+"px"}}>
              <strong>Data Source:</strong>&nbsp;&nbsp;
              <input type="radio" checked={this.state.selectedData==="openVolume"} name="plot-type" value="openVolume" id="openVolume" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="openVolume">Open Volume</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.selectedData==="realisedPNL"} name="plot-type" value="realisedPNL" id="realisedPNL" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="realisedPNL">Realised PNL</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.selectedData==="unrealisedPNL"} name="plot-type" value="unrealisedPNL" id="unrealisedPNL" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="unrealisedPNL">Unrealised PNL</label>&nbsp;&nbsp;&nbsp;
            </div>
            <XYPlot margin={{left: 125, bottom: 80}} width={820} height={500} xType="time" stackBy="y">
              <LineSeries data={this.state.activeData} />
              <HorizontalGridLines />
              <VerticalGridLines />
              <XAxis tickTotal={8} tickFormat={(v) => moment(v).format("h:mm a")} />
              <YAxis />
              <ChartLabel
                text="Date"
                className="alt-x-label"
                includeMargin={false}
                xPercent={0.475}
                yPercent={1.15}
                />
              <ChartLabel
                text={this.state.selectedData==="openVolume" ? "Volume" : "Profit"}
                className="alt-y-label"
                includeMargin={false}
                xPercent={-0.15}
                yPercent={0.06}
                style={{
                  transform: 'rotate(-90)',
                  textAnchor: 'end'
                }}
                />
            </XYPlot>
            <h2>Orders: {this.state.market}</h2>
            <table width="100%" cellSpacing="0" cellPadding="0" border="0">
              <thead>
                <tr>
                  <td>ID</td>
                  <td className="center">Side</td>
                  <td className="right">Size</td>
                  <td className="right">Price</td>
                  <td className="right">Status</td>
                </tr>
              </thead>
              <tbody>
              {this.state.orders.map(order => {
                return (
                  <tr>
                    <td>{order.id}</td>
                    <td className="center">{this.renderSide(order.side)}</td>
                    <td className="right">{order.size}</td>
                    <td className="right">{(parseInt(order.price) / (10 ** order.market.decimalPlaces)).toFixed(2)}</td>
                    <td className="right">{order.status}</td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        : <div><img src={loading} alt="Loading..." width="42" /></div>}
      </div>
    )
  }
}

export default Party;
