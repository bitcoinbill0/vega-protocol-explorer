#!flask/bin/python
from flask import Flask
from flask import jsonify
from flask import request
import pymongo
import requests
import os
import time
import json
from influxdb import InfluxDBClient

GQ_URL = os.environ['GQ_URL']

orders_query = '''
query {
  party(id: "PARTY_ID") {
    orders(skip: 0, first: 0, last: 50) {
      id
      price
      status
      size
      side
      market {
        decimalPlaces
        id
      }
      createdAt
      updatedAt
      type
    }
  }
}
'''

def get_orders_body(party_id):
    return {
      'query': orders_query.replace("PARTY_ID", party_id)
    }

time.sleep(5)

app = Flask(__name__)

INFLUX_HOST = os.environ['INFLUX_HOST']
MONGO_HOST = os.environ['MONGO_HOST']

influxdb_client = InfluxDBClient(host=INFLUX_HOST, port=8086)
influxdb_client.create_database('vega_history')
influxdb_client.switch_database('vega_history')

@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', '*')
  response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  return response

client = pymongo.MongoClient(host=MONGO_HOST,
                             port=27017,
                             username="root",
                             password="password123")
db = client.vega


valid_markets = ["ETHUSD/DEC20", "ETHBTC/DEC20", "GBPUSD/DEC20"]


@app.route('/')
def index():
    return jsonify({
        'ok': True
    })


def get_markets_arr():
    parties = list(db.parties.find())
    markets = []
    for party in parties:
        for position in party["positions"]:
            exists = len(list(filter(lambda market: market["name"] == position["market"]["name"], markets)))
            if exists == 0 and position["market"]["name"] in valid_markets:
                markets.append(position["market"])
    return markets


def get_positions_by_market(market_name):
    parties = list(db.parties.find())
    data = []
    for party in parties:
        accounts = party["accounts"]
        for position in party["positions"]:
            if position["market"]["name"] == market_name:
                position["openVolume"] = int(position["openVolume"])
                position["realisedPNL"] = int(position["realisedPNL"])
                position["unrealisedPNL"] = int(position["unrealisedPNL"])
                position["totalPNL"] = int(position["unrealisedPNL"]) + int(position["realisedPNL"])
                position["averageEntryPrice"] = int(position["averageEntryPrice"])
                position["market"]["data"]["markPrice"] = int(position["market"]["data"]["markPrice"])
                position["margins"][0]["asset"]["totalSupply"] = int(position["margins"][0]["asset"]["totalSupply"])
                position["margins"][0]["collateralReleaseLevel"] = int(position["margins"][0]["collateralReleaseLevel"])
                position["margins"][0]["initialLevel"] = int(position["margins"][0]["initialLevel"])
                position["margins"][0]["maintenanceLevel"] = int(position["margins"][0]["maintenanceLevel"])
                position["margins"][0]["searchLevel"] = int(position["margins"][0]["searchLevel"])
                accounts = list(filter(lambda a: a["asset"]["symbol"] == position["margins"][0]["asset"]["symbol"], accounts))
                for account in accounts:
                    account["balance"] = int(account["balance"])
                margin_balance = list(map(lambda a: a["balance"], list(filter(lambda a: a["type"] == "Margin", accounts))))[0]
                wallet_balance = list(map(lambda a: a["balance"], list(filter(lambda a: a["type"] == "General", accounts))))[0]
                position["balance"] = {
                    "margin": margin_balance,
                    "wallet": wallet_balance
                }
                data.append({
                    "partyId": party["id"],
                    "position": position
                })
    return data


@app.route('/open-positions', methods=['GET'])
def get_open_positions():
    market_name = request.args.get("market_name")
    if not market_name:
        return jsonify(data)
    data = get_positions_by_market(market_name)
    sort = request.args.get("sort", "ASC")
    reverse = True if sort == "DESC" else False
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 25))
    from_idx = page * size
    to_idx = from_idx + size
    data = sorted(data, key=lambda item: abs(item["position"]["openVolume"]), reverse=reverse)
    data = list(filter(lambda d: d["position"]["openVolume"] != 0, data))
    return jsonify(data[from_idx:to_idx])


@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    market_name = request.args.get("market_name")
    if not market_name:
        return jsonify(data)
    data = get_positions_by_market(market_name)
    sort = request.args.get("sort", "ASC")
    reverse = True if sort == "DESC" else False
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 25))
    from_idx = page * size
    to_idx = from_idx + size
    data = sorted(data, key=lambda item: item["position"]["totalPNL"], reverse=reverse)
    return jsonify(data[from_idx:to_idx])


@app.route('/leaderboard/unrealised', methods=['GET'])
def get_leaderboard_upnl():
    market_name = request.args.get("market_name")
    if not market_name:
        return jsonify(data)
    data = get_positions_by_market(market_name)
    sort = request.args.get("sort", "ASC")
    reverse = True if sort == "DESC" else False
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 25))
    from_idx = page * size
    to_idx = from_idx + size
    data = sorted(data, key=lambda item: item["position"]["unrealisedPNL"], reverse=reverse)
    return jsonify(data[from_idx:to_idx])


@app.route('/leaderboard/realised', methods=['GET'])
def get_leaderboard_rpnl():
    market_name = request.args.get("market_name")
    if not market_name:
        return jsonify(data)
    data = get_positions_by_market(market_name)
    sort = request.args.get("sort", "ASC")
    reverse = True if sort == "DESC" else False
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 25))
    from_idx = page * size
    to_idx = from_idx + size
    data = sorted(data, key=lambda item: item["position"]["realisedPNL"], reverse=reverse)
    return jsonify(data[from_idx:to_idx])


@app.route('/liquidations', methods=['GET'])
def get_liqs():
    liqs = {}
    market_name = request.args.get("market_name")
    depth = float(request.args.get("depth", "0.1"))
    if not market_name:
        return jsonify(liqs)
    data = get_positions_by_market(market_name)
    data = list(filter(lambda d: d["position"]["openVolume"] != 0, data))
    markPrice = 0
    decimals = 0
    for item in data:
        # liquidation price = mark price +/- (((margin balance - maintenance level) + balance of asset in main wallet) / position size))
        markPrice = item["position"]["market"]["data"]["markPrice"]
        decimals = item["position"]["margins"][0]["asset"]["decimals"]
        marginBalance = item["position"]["balance"]["margin"]
        walletBalance = item["position"]["balance"]["wallet"]
        maintenanceLevel = item["position"]["margins"][0]["maintenanceLevel"]
        openVolume = item["position"]["openVolume"]
        liq_price = round(markPrice - (((marginBalance - maintenanceLevel) + walletBalance) / openVolume))
        item["position"]["margins"][0]["liquidationLevel"] = liq_price
    min_liq = markPrice * (1 - depth)
    max_liq = markPrice * (1 + depth)
    long_liquidations = sorted(list(map(lambda x: {"openVolume": x["position"]["openVolume"], "liquidationLevel": x["position"]["margins"][0]["liquidationLevel"]}, list(filter(lambda x: x["position"]["openVolume"] > 0 and min_liq < x["position"]["margins"][0]["liquidationLevel"] < max_liq and x["position"]["margins"][0]["liquidationLevel"] < markPrice, data)))), key=lambda k: k['liquidationLevel'], reverse=True)
    short_liquidations = sorted(list(map(lambda x: {"openVolume": abs(x["position"]["openVolume"]), "liquidationLevel": x["position"]["margins"][0]["liquidationLevel"]}, list(filter(lambda x: x["position"]["openVolume"] < 0 and min_liq < x["position"]["margins"][0]["liquidationLevel"] < max_liq and x["position"]["margins"][0]["liquidationLevel"] > markPrice, data)))), key=lambda k: k['liquidationLevel'], reverse=False)
    prev_liq = 0
    for liq in long_liquidations:
        liq["openVolume"] = prev_liq + liq["openVolume"]
        prev_liq = liq["openVolume"]
    prev_liq = 0
    for liq in short_liquidations:
        liq["openVolume"] = prev_liq + liq["openVolume"]
        prev_liq = liq["openVolume"]
    liqs["decimals"] = decimals
    liqs["long"] = long_liquidations
    liqs["short"] = short_liquidations
    return jsonify(liqs)


@app.route('/markets', methods=['GET'])
def get_markets():
    return jsonify(get_markets_arr())


@app.route('/party', methods=['GET'])
def get_party():
    party = {}
    party_id = request.args.get("party_id")
    if not party_id:
        return jsonify(party)
    data = list(influxdb_client.query('SELECT * FROM "' + party_id + '" WHERE time > now() - 1d'))[0]
    for item in data:
        item["party"] = json.loads(item["party"])
        item["party"]["positions"][0]["openVolume"] = int(item["party"]["positions"][0]["openVolume"])
        item["party"]["positions"][0]["averageEntryPrice"] = int(item["party"]["positions"][0]["averageEntryPrice"])
        item["party"]["positions"][0]["realisedPNL"] = int(item["party"]["positions"][0]["realisedPNL"])
        item["party"]["positions"][0]["unrealisedPNL"] = int(item["party"]["positions"][0]["unrealisedPNL"])
    result = {
        'history': data
    }
    try:
        response = requests.post(GQ_URL, json=get_orders_body(party_id))
        orders = response.json()["data"]["party"]["orders"]
        result["orders"] = orders
    except:
        print('Error calling Vega API')
    return jsonify(result)


@app.route('/parties', methods=['GET'])
def get_parties():
    parties = list(db.parties.find())
    party_id = request.args.get("party_id")
    if party_id:
        parties = list(filter(lambda p: p["id"] == party_id, parties))
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 25))
    from_idx = page * size
    to_idx = from_idx + size
    for party in parties:
        del party["_id"]
    return jsonify(parties[from_idx:to_idx])


if __name__ == '__main__':
    app.run(debug=True)
