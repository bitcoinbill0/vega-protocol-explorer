#!flask/bin/python
from flask import Flask
from flask import jsonify
import pymongo

app = Flask(__name__)

client = pymongo.MongoClient(host="localhost",
                             port=27017,
                             username="root",
                             password="password123")
db = client.vega


@app.route('/')
def index():
    return "Hello, World!"


@app.route('/markets', methods=['GET'])
def get_markets():
    markets = list(db.markets.find())
    for market in markets:
        del market["_id"]
    return jsonify(markets)


@app.route('/parties', methods=['GET'])
def get_parties():
    parties = list(db.parties.find())
    for party in parties:
        del party["_id"]
    return jsonify(parties)


if __name__ == '__main__':
    app.run(debug=True)
