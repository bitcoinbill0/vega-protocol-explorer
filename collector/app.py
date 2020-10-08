import websocket
import json
import requests
import os
import pymongo

API_URL = os.environ['API_URL']
WS_URL = os.environ['WS_URL']

client = pymongo.MongoClient(host="localhost",
                             port=27017,
                             username="root",
                             password="password123")
db = client.vega


def get_markets():
    return requests.get(f"{API_URL}/markets").json()["markets"]


def get_parties():
    return requests.get(f"{API_URL}/parties").json()["parties"]


def get_positions_query(party_id):
    return '''
        subscription {
            positions(partyId: "''' + party_id + '''") {
                market {
                    id
                    name
                }
                openVolume
                realisedPNL
                unrealisedPNL
                averageEntryPrice
                margins {
                    asset {
                        id
                        name
                        symbol
                    }
                    maintenanceLevel
                    searchLevel
                    initialLevel
                    collateralReleaseLevel
                    timestamp
                    party {
                        id
                    }
                }
            }
        }
    '''


def get_market_data_query(market_id):
    return '''
        subscription {
            marketData(marketId: "''' + market_id + '''") {
                market {
                    id
                    tradableInstrument {
                        instrument {
                            id
                            code
                            name
                            baseName
                            quoteName
                            metadata {
                                tags
                            }
                        }
                        marginCalculator {
                            scalingFactors {
                                searchLevel
                                initialMargin
                                collateralRelease
                            }
                        }
                    }
                    decimalPlaces
                }
                markPrice
                bestBidPrice
                bestBidVolume
                bestOfferPrice
                bestOfferVolume
                midPrice
                timestamp
            }
        }
    '''


def get_orders_query(party_id, market_id):
    orders_query = '''
        subscription {
            orders(
                marketId: "''' + market_id + '''",
                partyId: "''' + party_id + '''"
            ) {
                id
                price
                timeInForce
                side
                market {
                    id
                    name
                }
                size
                remaining
                party {
                    id
                }
                createdAt
                expiresAt
                status
                reference
                trades {
                    buyOrder
                    sellOrder
                    buyer {
                        id
                    }
                    seller {
                        id
                    }
                    aggressor
                    price
                    size
                    createdAt
                }
                type
                rejectionReason
            }
        }
    '''


def get_market_depth_query(market_id):
    return '''
        subscription {
            marketDepth(marketId: "''' + market_id + '''") {
                market {
                id
                    name
                }
                buy {
                    price
                    volume
                    numberOfOrders
                }
                sell {
                    price
                    volume
                    numberOfOrders
                }
            }
        }
    '''


def get_margins_query(party_id, market_id):
    return '''
        subscription {
            margins(
                partyId: "''' + party_id + '''",
                marketID: "''' + market_id + '''"
            ) {
                asset {
                    id
                    name
                    symbol
                }
                maintenanceLevel
                searchLevel
                initialLevel
                collateralReleaseLevel
                timestamp
                party {
                    id
                }
            }
        }
    '''


def get_trades_query(party_id, market_id):
    return '''
        subscription {
            trades(
                partyId: "''' + party_id + '''",
                marketId: "''' + market_id + '''"
            ) {
                id
                market {
                    id
                    name
                }
                buyOrder
                sellOrder
                buyer {
                    id
                }
                seller {
                    id
                }
                aggressor
                price
                type
                size
                createdAt
                buyerFee {
                    makerFee
                    infrastructureFee
                    liquidityFee
                }
                sellerFee {
                    makerFee
                    infrastructureFee
                    liquidityFee
                }
                buyerAuctionBatch
                sellerAuctionBatch
            }
        }
    '''


def sub_init(ws):
    ws.send(json.dumps({
        'type': 'connection_init'
    }))


def sub_markets(ws):
    markets = get_markets()
    for market in markets:
        market_id = market['id']
        ws.send(json.dumps({
            'id': f'market_{market_id}',
            'type': 'start',
            'payload': {'query': get_market_data_query(market_id)}
        }))


def sub_positions(ws):
    parties = get_parties()
    for party in parties:
        party_id = party['id']
        ws.send(json.dumps({
            'id': f'position_party_{party_id}',
            'type': 'start',
            'payload': {'query': get_positions_query(party_id)}
        }))


def sub_trades(ws):
    parties = get_parties()
    markets = get_markets()
    for party in parties:
        for market in markets:
            party_id = party['id']
            market_id = market['id']
            ws.send(json.dumps({
                'id': f'trade_party_{party_id}_market_{market_id}',
                'type': 'start',
                'payload': {'query': get_trades_query(party_id, market_id)}
            }))


def sub_margins(ws):
    parties = get_parties()
    markets = get_markets()
    for party in parties:
        for market in markets:
            party_id = party['id']
            market_id = market['id']
            ws.send(json.dumps({
                'id': f'margin_party_{party_id}_market_{market_id}',
                'type': 'start',
                'payload': {'query': get_margins_query(party_id, market_id)}
            }))


def sub_market_depth(ws):
    markets = get_markets()
    for market in markets:
        market_id = market['id']
        ws.send(json.dumps({
            'id': f'market_depth_{market_id}',
            'type': 'start',
            'payload': {'query': get_market_depth_query(market_id)}
        }))


def handle_market(market):
    if market.get("market") and market.get("market")["id"]:
        saved_market = db.markets.find_one({"market.id": market["market"]["id"]})
        if not saved_market:
            db.markets.insert_one(market)
        else:
            db.markets.update({"_id": saved_market["_id"]}, {"$set": market})


def on_message(ws, message):
    json_msg = json.loads(message)
    if json_msg['id'].startswith('position'):
        print(json_msg)
    elif json_msg['id'].startswith('market_depth'):
        print(json_msg)
    elif json_msg['id'].startswith('margin'):
        print(json_msg)
    elif json_msg['id'].startswith('trade'):
        print(json_msg)
    elif json_msg['id'].startswith('market'):
        handle_market(json_msg['payload']['data']['marketData'])


def on_error(ws, error):
    print(error)


def on_close(ws):
    print('### closed ###')


def on_open(ws):
    sub_init(ws)
    sub_markets(ws)
    # sub_positions(ws)
    # sub_margins(ws)
    # sub_market_depth(ws)
    # sub_trades(ws)


def connect():
    ws = websocket.WebSocketApp(f"{WS_URL}/query",
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.on_open = on_open
    ws.run_forever()


if __name__ == '__main__':
    connect()
