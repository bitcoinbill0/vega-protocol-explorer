import React from 'react';
import './App.css';
import {
  XYPlot,
  XAxis,
  YAxis,
  VerticalGridLines,
  HorizontalGridLines,
  HorizontalBarSeries
} from 'react-vis';
import ReactTooltip from 'react-tooltip';
import MoreIcon from './more.png';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      markets: [],
      openPositions: [],
      leaderboard: [],
      loserboard: [],
      tableType: "OpenPositions",
      longPositionVol: 0,
      shortPositionVol: 0,
      longWinnerVol: 0,
      shortWinnerVol: 0,
      longLoserVol: 0,
      shortLoserVol: 0,
      baseUri: "localhost"
    }
  }
  buildSentiment() {
    let longPositionVol = 0;
    let shortPositionVol = 0;
    let longWinnerVol = 0;
    let shortWinnerVol = 0;
    let longLoserVol = 0;
    let shortLoserVol = 0;
    this.state.openPositions.forEach(pos => {
      if(pos.position.openVolume > 0) longPositionVol += pos.position.openVolume;
      if(pos.position.openVolume < 0) shortPositionVol += Math.abs(pos.position.openVolume);
    });
    this.state.leaderboard.forEach(pos => {
      if(pos.position.openVolume > 0) longWinnerVol += pos.position.openVolume;
      if(pos.position.openVolume < 0) shortWinnerVol += Math.abs(pos.position.openVolume)
    });
    this.state.loserboard.forEach(pos => {
      if(pos.position.openVolume > 0) longLoserVol += pos.position.openVolume;
      if(pos.position.openVolume < 0) shortLoserVol += Math.abs(pos.position.openVolume)
    });
    this.setState({ longPositionVol, shortPositionVol, longWinnerVol, shortWinnerVol, longLoserVol, shortLoserVol });
  }
  fetchLeaderboard() {
    const activeMarket = this.state.markets.filter(market => market.active)[0];
    fetch("http://" + this.state.baseUri + ":5000/leaderboard?market_name=" + activeMarket.name + "&sort=DESC")
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({leaderboard: result}, () => {
            this.buildSentiment();
          });
        },
        (error) => {
          console.error(error);
        }
      );
  }
  fetchLoserboard() {
    const activeMarket = this.state.markets.filter(market => market.active)[0];
    fetch("http://" + this.state.baseUri + ":5000/leaderboard?market_name=" + activeMarket.name + "&sort=ASC")
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({loserboard: result}, () => {
            this.buildSentiment();
          });
        },
        (error) => {
          console.error(error);
        }
      );
  }
  fetchOpenPositions() {
    const activeMarket = this.state.markets.filter(market => market.active)[0];
    fetch("http://" + this.state.baseUri + ":5000/open-positions?market_name=" + activeMarket.name + "&sort=DESC")
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({openPositions: result}, () => {
            this.buildSentiment();
          });
        },
        (error) => {
          console.error(error);
        }
      );
  }
  fetchMarkets() {
    fetch("http://" + this.state.baseUri + ":5000/markets")
      .then(res => res.json())
      .then(
        (result) => {
          result[0].active = true;
          this.setState({markets: result}, () => {
            this.fetchLeaderboard();
            this.fetchLoserboard();
            this.fetchOpenPositions();
          });
        },
        (error) => {
          console.error(error);
        }
      );
  }
  componentDidMount() {
    this.fetchMarkets();
  }
  selectMarket(name) {
    this.state.markets.forEach(market => {
      if(market.name !== name) market.active = false;
      if(market.name === name) market.active = true;
    });
    this.setState({ markets: this.state.markets }, () => {
      this.fetchLeaderboard();
      this.fetchLoserboard();
      this.fetchOpenPositions();
    });
  }
  onChangeTableType(event) {
    this.setState({tableType: event.target.value});
  }
  render() {
    return (
      <div className="wrapper">
        <ReactTooltip />
        <h1>Vega :: Markets Explorer</h1>
        <p>Explore interesting data about parties trading on Vega Protocol.</p>
        <hr />
        <div className="nav">
          {this.state.markets.map(market => {
            if(market.active) {
              return <span className="market-link-active">{market.name}</span>
            } else {
              return <span className="market-link" onClick={() => this.selectMarket(market.name)}>{market.name}</span>;
            }
          })}
        </div>
        <div onChange={this.onChangeTableType.bind(this)}>
          <span data-tip="View the 25 largest open positions">
            <input type="radio" checked={this.state.tableType==="OpenPositions"} name="table-type" value="OpenPositions" id="whale-type" />&nbsp;
            <label htmlFor="whale-type"><i style={{marginTop:-8+'px'}} className="em em-whale" aria-label=""></i></label>&nbsp;&nbsp;&nbsp;
          </span>
          <span data-tip="View top 25 traders by PNL">
            <input type="radio" checked={this.state.tableType==="Leaderboard"} name="table-type" value="Leaderboard" id="moneybag-type" />&nbsp;
            <label htmlFor="moneybag-type"><i style={{marginTop:-8+'px'}} className="em em-moneybag" aria-label=""></i></label>&nbsp;&nbsp;&nbsp;
          </span>
          <span data-tip="View the worst 25 traders by PNL">
            <input type="radio" checked={this.state.tableType==="Loserboard"} name="table-type" value="Loserboard" id="sweat-type" />&nbsp;
            <label htmlFor="sweat-type"><i style={{marginTop:-8+'px'}} className="em em-sweat" aria-label=""></i></label>&nbsp;&nbsp;&nbsp;
          </span>
          <span data-tip="View clusters of liquidations">
            <input type="radio" checked={this.state.tableType==="Liquidations"} name="table-type" value="Liquidations" id="warning-type" />&nbsp;
            <label htmlFor="warning-type"><i style={{marginTop:-8+'px'}} className="em em-warning" aria-label=""></i></label>
          </span>
        </div>
        <div className="table-holder">
         {this.state.tableType === "Leaderboard" ? (
           <div>
             <h2>Current Sentiment</h2>
             <XYPlot width={900} height={160} margin={{bottom: 80, left: 60, right: 10, top: 20}}  stackBy="x" yType="ordinal">
               <VerticalGridLines />
               <HorizontalGridLines />
               <XAxis tickTotal={5} tickFormat={v => {
                 if (v >= 1000000) {
                   return `${v/1000000}M`
                 } else if (v >= 1000) {
                   return `${v/1000}K`
                 }
                 return `${v}`
               }} />
               <YAxis />
               <HorizontalBarSeries data={[{x: Math.round(this.state.longWinnerVol), y: 'Long'}]} color='#4aa165' />
               <HorizontalBarSeries data={[{x: Math.round(this.state.shortWinnerVol), y: 'Short'}]} color='#d16547' />
             </XYPlot>
             <h2>Big Winners</h2>
             <table width="100%" cellSpacing="0" cellPadding="0" border="0">
               <thead>
                 <tr>
                   <td></td>
                   <td>Party</td>
                   <td className="right">RPNL</td>
                   <td className="right">UPNL</td>
                   <td className="right">Net PNL</td>
                 </tr>
               </thead>
               <tbody>
                 {this.state.leaderboard.map(party => {
                   const realisedPNL = (party.position.realisedPNL) / (10 ** party.position.margins[0].asset.decimals);
                   const unrealisedPNL = (party.position.unrealisedPNL) / (10 ** party.position.margins[0].asset.decimals);
                   const totalPNL = (party.position.totalPNL) / (10 ** party.position.margins[0].asset.decimals);
                   return (
                     <tr>
                       <td><a href={"/party/"+party.partyId} target="_blank" rel="noopener noreferrer"><img className="more-icon" src={MoreIcon} width="12" alt="Open" /></a></td>
                       <td>{party.partyId}</td>
                       <td className="right">{realisedPNL.toFixed(2)}</td>
                       <td className="right">{unrealisedPNL.toFixed(2)}</td>
                       <td className="right">{totalPNL.toFixed(2)}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         ) : this.state.tableType === "OpenPositions" ? (
           <div>
             <h2>Current Sentiment</h2>
             <XYPlot width={900} height={160} margin={{bottom: 80, left: 60, right: 10, top: 20}}  stackBy="x" yType="ordinal">
               <VerticalGridLines />
               <HorizontalGridLines />
               <XAxis tickTotal={5} tickFormat={v => {
                 if (v >= 1000000) {
                   return `${v/1000000}M`
                 } else if (v >= 1000) {
                   return `${v/1000}K`
                 }
                 return `${v}`
               }} />
               <YAxis />
               <HorizontalBarSeries data={[{x: Math.round(this.state.longPositionVol), y: 'Long'}]} color='#4aa165' />
               <HorizontalBarSeries data={[{x: Math.round(this.state.shortPositionVol), y: 'Short'}]} color='#d16547' />
             </XYPlot>
             <h2>Largest Positions</h2>
             <table width="100%" cellSpacing="0" cellPadding="0" border="0">
               <thead>
                 <tr>
                   <td></td>
                   <td>Party</td>
                   <td className="right">Size</td>
                   <td className="right">Entry</td>
                   <td className="right">UPNL</td>
                 </tr>
               </thead>
               <tbody>
                 {this.state.openPositions.map(party => {
                   const averageEntryPrice = (party.position.averageEntryPrice) / (10 ** party.position.margins[0].asset.decimals);
                   const unrealisedPNL = (party.position.unrealisedPNL) / (10 ** party.position.margins[0].asset.decimals);
                   const activeMarket = this.state.markets.filter(market => market.active)[0];
                   return (
                     <tr>
                       <td><a href={"/party/"+party.partyId} target="_blank" rel="noopener noreferrer"><img className="more-icon" src={MoreIcon} width="12" alt="Open" /></a></td>
                       <td>{party.partyId}</td>
                       <td className="right">{party.position.openVolume}</td>
                       <td className="right">{averageEntryPrice.toFixed(activeMarket.name==="ETHUSD/DEC20" ? 2 : 4)}</td>
                       <td className="right">{unrealisedPNL.toFixed(2)}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         ) : this.state.tableType === "Loserboard" ? (
           <div>
             <h2>Current Sentiment</h2>
             <XYPlot width={900} height={160} margin={{bottom: 80, left: 60, right: 10, top: 20}}  stackBy="x" yType="ordinal">
               <VerticalGridLines />
               <HorizontalGridLines />
               <XAxis tickTotal={5} tickFormat={v => {
                 if (v >= 1000000) {
                   return `${v/1000000}M`
                 } else if (v >= 1000) {
                   return `${v/1000}K`
                 }
                 return `${v}`
               }} />
               <YAxis />
               <HorizontalBarSeries data={[{x: Math.round(this.state.longLoserVol), y: 'Long'}]} color='#4aa165' />
               <HorizontalBarSeries data={[{x: Math.round(this.state.shortLoserVol), y: 'Short'}]} color='#d16547' />
             </XYPlot>
             <h2>Big Losers</h2>
             <table width="100%" cellSpacing="0" cellPadding="0" border="0">
               <thead>
                 <tr>
                   <td></td>
                   <td>Party</td>
                   <td className="right">RPNL</td>
                   <td className="right">UPNL</td>
                   <td className="right">Net PNL</td>
                 </tr>
               </thead>
               <tbody>
                 {this.state.loserboard.map(party => {
                   const realisedPNL = (party.position.realisedPNL) / (10 ** party.position.margins[0].asset.decimals);
                   const unrealisedPNL = (party.position.unrealisedPNL) / (10 ** party.position.margins[0].asset.decimals);
                   const totalPNL = (party.position.totalPNL) / (10 ** party.position.margins[0].asset.decimals);
                   return (
                     <tr>
                       <td><a href={"/party/"+party.partyId} target="_blank" rel="noopener noreferrer"><img className="more-icon" src={MoreIcon} width="12" alt="Open" /></a></td>
                       <td>{party.partyId}</td>
                       <td className="right">{realisedPNL.toFixed(2)}</td>
                       <td className="right">{unrealisedPNL.toFixed(2)}</td>
                       <td className="right">{totalPNL.toFixed(2)}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         ) : (
           <div>
            <h2>Liquidation Clusters</h2>
           </div>
         )}
        </div>
      </div>
    );
  }
}

export default App;
