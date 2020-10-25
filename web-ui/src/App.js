import React from 'react';
import './App.css';
import {
  XYPlot,
  XAxis,
  YAxis,
  AreaSeries,
  ChartLabel,
  HorizontalBarSeries
} from 'react-vis';
import ReactTooltip from 'react-tooltip';
import loading from './loading.gif';

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
      baseUri: "localhost",
      liquidationsDepth: 0.1,
      liquidations: {
        long: [],
        short: []
      }
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
  fetchLiquidations() {
    const activeMarket = this.state.markets.filter(market => market.active)[0];
    fetch("http://" + this.state.baseUri + ":5000/liquidations?market_name=" + activeMarket.name + "&depth=" + this.state.liquidationsDepth)
      .then(res => res.json())
      .then(
        (result) => {
          const longLiquidations = [];
          const shortLiquidations = [];
          this.setState({liquidations: {
            "long": [],
            "short": []
          }});
          result["long"].forEach((item, idx) => {
            longLiquidations.push({
              y: item["openVolume"],
              x: Number((item["liquidationLevel"] / (10 ** result["decimals"])).toFixed(5))
            });
          });
          result["short"].forEach((item, idx) => {
            shortLiquidations.push({
              y: item["openVolume"],
              x: Number((item["liquidationLevel"] / (10 ** result["decimals"])).toFixed(5))
            });
          });
          const liquidations = {
            "long": longLiquidations,
            "short": shortLiquidations
          }
          console.log(liquidations)
          this.setState({liquidations: liquidations});
        },
        (error) => {
          console.error(error);
        }
      );
  }
  fetchLeaderboard() {
    const activeMarket = this.state.markets.filter(market => market.active)[0];
    fetch("http://" + this.state.baseUri + ":5000/leaderboard?market_name=" + activeMarket.name + "&sort=DESC")
      .then(res => res.json())
      .then(
        (result) => {
          if(this.state.leaderboard.length > 0) {
            result.forEach((item, idx) => {
              const position = this.state.leaderboard[idx].position;
              item.position.lastOpenVolume = position.openVolume;
              item.position.lastRealisedPNL = position.realisedPNL;
              item.position.lastTotalPNL = position.totalPNL;
              item.position.lastAverageEntryPrice = position.averageEntryPrice;
              item.position.lastUnrealisedPNL = position.unrealisedPNL;
            });
          }
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
          if(this.state.loserboard.length > 0) {
            result.forEach((item, idx) => {
              const position = this.state.loserboard[idx].position;
              item.position.lastOpenVolume = position.openVolume;
              item.position.lastRealisedPNL = position.realisedPNL;
              item.position.lastTotalPNL = position.totalPNL;
              item.position.lastAverageEntryPrice = position.averageEntryPrice;
              item.position.lastUnrealisedPNL = position.unrealisedPNL;
            });
          }
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
          if(this.state.openPositions.length > 0) {
            result.forEach((item, idx) => {
              const position = this.state.openPositions[idx].position;
              item.position.lastOpenVolume = position.openVolume;
              item.position.lastRealisedPNL = position.realisedPNL;
              item.position.lastTotalPNL = position.totalPNL;
              item.position.lastAverageEntryPrice = position.averageEntryPrice;
              item.position.lastUnrealisedPNL = position.unrealisedPNL;
            });
          }
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
    if(this.state.markets.length === 0) {
      fetch("http://" + this.state.baseUri + ":5000/markets")
        .then(res => res.json())
        .then(
          (result) => {
            result[0].active = true;
            this.setState({markets: result}, () => {
              this.fetchLeaderboard();
              this.fetchLiquidations();
              this.fetchLoserboard();
              this.fetchOpenPositions();
            });
          },
          (error) => {
            console.error(error);
          }
        );
    } else {
      this.fetchLiquidations();
      this.fetchLeaderboard();
      this.fetchLoserboard();
      this.fetchOpenPositions();
    }
  }
  componentDidMount() {
    this.timer = setInterval(() => this.fetchMarkets(), 1000);
  }
  componentWillUnmount() {
    this.timer = null;
  }
  selectMarket(name) {
    this.state.markets.forEach(market => {
      if(market.name !== name) market.active = false;
      if(market.name === name) market.active = true;
    });
    this.setState({ markets: this.state.markets }, () => {
      this.fetchLiquidations();
      this.fetchLeaderboard();
      this.fetchLoserboard();
      this.fetchOpenPositions();
    });
  }
  onChangeTableType(event) {
    this.setState({tableType: event.target.value});
  }
  onChangeLiqDepth(event) {
    this.setState({liquidationsDepth: parseFloat(event.target.value)});
  }
  renderTableWithSentiment(longVol, shortVol, data, title) {
    if(data.length > 0) {
      return (
        <div>
          <h2>Current Sentiment</h2>
          <XYPlot width={900} height={160} margin={{bottom: 80, left: 60, right: 10, top: 20}}  stackBy="x" yType="ordinal">
            <XAxis tickTotal={5} tickFormat={v => {
              if (v >= 1000000) {
                return `${v/1000000}M`
              } else if (v >= 1000) {
                return `${v/1000}K`
              }
              return `${v}`
            }} />
            <YAxis />
            <HorizontalBarSeries data={[{x: Math.round(longVol), y: 'Long'}]} color='#4aa165' />
            <HorizontalBarSeries data={[{x: Math.round(shortVol), y: 'Short'}]} color='#d16547' />
          </XYPlot>
          <h2>{title}</h2>
          <table width="100%" cellSpacing="0" cellPadding="0" border="0">
            <thead>
              <tr>
                <td>Party</td>
                <td className="center">Side</td>
                <td className="right">Size</td>
                <td className="right">Entry</td>
                <td className="right">Net PNL</td>
              </tr>
            </thead>
            <tbody>
              {data.map(party => {
                const averageEntryPrice = (party.position.averageEntryPrice) / (10 ** party.position.margins[0].asset.decimals);
                const unrealisedPNL = (party.position.unrealisedPNL) / (10 ** party.position.margins[0].asset.decimals);
                const totalPNL = (party.position.totalPNL) / (10 ** party.position.margins[0].asset.decimals);
                const activeMarket = this.state.markets.filter(market => market.active)[0];
                const PNL = title === "Largest Positions" ? unrealisedPNL : totalPNL;
                return (
                  <tr>
                    <td><a href={"/party/"+party.partyId} target="_blank" rel="noopener noreferrer">{party.partyId}</a></td>
                    <td className={"center"}>{this.renderSide(party.position.openVolume)}</td>
                    <td className={"right"}><span className={"flashable " + (party.position.openVolume > party.position.lastOpenVolume ? "flash-value-green" : party.position.openVolume < party.position.lastOpenVolume ? "flash-value-red" : "")}>{Math.abs(party.position.openVolume)}</span></td>
                    <td className={"right"}>{averageEntryPrice.toFixed(activeMarket.name==="ETHUSD/DEC20" ? 2 : 4)}</td>
                    <td className={"right"}><span className={"flashable " + (party.position.totalPNL > party.position.lastTotalPNL ? "flash-value-green" : party.position.totalPNL < party.position.lastTotalPNL ? "flash-value-red" : "")}>{PNL.toFixed(2)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div><img src={loading} alt="Loading..." width="42" /></div>
      );
    }
  }
  renderSide(vol) {
    if(vol > 0) {
      return <span className="long-label">Long</span>
    } else {
      return <span className="short-label">Short</span>
    }
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
           this.renderTableWithSentiment(this.state.longWinnerVol, this.state.shortWinnerVol, this.state.leaderboard, 'Biggest Winners')
         ) : this.state.tableType === "OpenPositions" ? (
           this.renderTableWithSentiment(this.state.longPositionVol, this.state.shortPositionVol, this.state.openPositions, 'Largest Positions')
         ) : this.state.tableType === "Loserboard" ? (
           this.renderTableWithSentiment(this.state.longLoserVol, this.state.shortLoserVol, this.state.loserboard, 'Biggest Losers')
         ) : (
           <div>
            <h2>Liquidations</h2>
            <div onChange={this.onChangeLiqDepth.bind(this)} style={{marginBottom:20+"px"}}>
              <strong>Depth:</strong>&nbsp;&nbsp;
              <input type="radio" checked={this.state.liquidationsDepth===0.01} name="liq-depth" value="0.01" id="liq_0_01" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="liq_0_01">1%</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.liquidationsDepth===0.03} name="liq-depth" value="0.03" id="liq_0_03" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="liq_0_03">3%</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.liquidationsDepth===0.05} name="liq-depth" value="0.05" id="liq_0_05" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="liq_0_05">5%</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.liquidationsDepth===0.1} name="liq-depth" value="0.1" id="liq_0_1" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="liq_0_1">10%</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.liquidationsDepth===0.2} name="liq-depth" value="0.2" id="liq_0_2" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="liq_0_2">20%</label>&nbsp;&nbsp;&nbsp;
              <input type="radio" checked={this.state.liquidationsDepth===0.5} name="liq-depth" value="0.5" id="liq_0_5" />&nbsp;
              <label style={{cursor:"pointer"}} htmlFor="liq_0_5">50%</label>&nbsp;&nbsp;&nbsp;
            </div>
            {
              this.state.liquidations.long.length > 0 ? (
                <XYPlot margin={{left: 125, bottom: 80}} width={820} height={500} stackBy="y">
                  <AreaSeries data={this.state.liquidations.short} color='#4aa165'/>
                  <AreaSeries data={this.state.liquidations.long} color='#d16547'/>
                  <XAxis tickTotal={8} />
                  <YAxis />
                  <ChartLabel
                    text="Price"
                    className="alt-x-label"
                    includeMargin={false}
                    xPercent={0.475}
                    yPercent={1.15}
                    />
                  <ChartLabel
                    text="Cumulative Volume"
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
              ) :
              <div>
                <em>There are no liquidations to display for the selected market and depth.</em>
              </div>
            }
           </div>
         )}
        </div>
      </div>
    );
  }
}

export default App;
