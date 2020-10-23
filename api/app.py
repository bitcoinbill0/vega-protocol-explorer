#!flask/bin/python
from flask import Flask
from flask import jsonify
from flask import request
import pymongo
import os
import time

time.sleep(5)

app = Flask(__name__)

INFLUX_HOST = os.environ['INFLUX_HOST']
MONGO_HOST = os.environ['MONGO_HOST']

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
    return "Hello, World!"


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
        for position in party["positions"]:
            if position["market"]["name"] == market_name:
                position["openVolume"] = int(position["openVolume"])
                position["realisedPNL"] = int(position["realisedPNL"])
                position["unrealisedPNL"] = int(position["unrealisedPNL"])
                position["totalPNL"] = int(position["unrealisedPNL"]) + int(position["realisedPNL"])
                position["averageEntryPrice"] = int(position["averageEntryPrice"])
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


@app.route('/sentiment', methods=['GET'])
def get_sentiment():
    sentiment = []
    markets = get_markets_arr()
    for market in markets:
        positions = get_positions_by_market(market["name"])
        short_positions = list(filter(lambda x: x["position"]["openVolume"] < 0, positions))
        long_positions = list(filter(lambda x: x["position"]["openVolume"] > 0, positions))
        # TODO - determine sentiment from positions
        short_open_volume = sum(list(map(lambda x: x["position"]["openVolume"], short_positions)))
        long_open_volume = sum(list(map(lambda x: x["position"]["openVolume"], long_positions)))
        short_sum_product = sum(list(map(lambda x: x["position"]["openVolume"] * x["position"]["averageEntryPrice"], short_positions)))
        long_sum_product = sum(list(map(lambda x: x["position"]["openVolume"] * x["position"]["averageEntryPrice"], long_positions)))
        sentiment.append({
            'longOpenVolume': long_open_volume,
            'shortOpenVolume': short_open_volume,
            'longAverageEntryPrice': round(long_sum_product / long_open_volume),
            'shortAverageEntryPrice': round(short_sum_product / short_open_volume),
            'market': market
        })
    return jsonify(sentiment)


@app.route('/markets', methods=['GET'])
def get_markets():
    return jsonify(get_markets_arr())


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
