import websocket
import json
import requests
import os

API_URL = os.environ['API_URL']
WS_URL = os.environ['WS_URL']

def get_markets():
    return requests.get(f"{API_URL}/markets").json()["markets"][0:1]

def get_parties():
    return requests.get(f"{API_URL}/parties").json()["parties"][0:3]

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
                        id,
                        name,
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
                    name
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

# orders_query = '''
#     subscription {
#         orders(
#             marketId: "''' + market_id + '''",
#             partyId: "''' + party_id + '''"
#         ) {
#             id
#             price
#             timeInForce
#             side
#             market {
#                 id
#                 name
#             }
#             size
#             remaining
#             party {
#                 id
#             }
#             createdAt
#             expiresAt
#             status
#             reference
#             trades {
#                 buyOrder
#                 sellOrder
#                 buyer {
#                     id
#                 }
#                 seller {
#                     id
#                 }
#                 aggressor
#                 price
#                 size
#                 createdAt
#             }
#             type
#             rejectionReason
#         }
#     }
# '''

# market_depth_query = '''
#     subscription {
#         marketDepth(marketId: "''' + market_id + '''") {
#             market {
#             id
#                 name
#             }
#             buy {
#                 price
#                 volume
#                 numberOfOrders
#                 cumulativeVolume
#             }
#             sell {
#                 price
#                 volume
#                 numberOfOrders
#                 cumulativeVolume
#             }
#         }
#     }
# '''

# margins_query = '''
#     subscription {
#         margins(
#             partyId: "''' + party_id + '''",
#             marketID: "''' + market_id + '''"
#         ) {
#             asset
#             maintenanceLevel
#             searchLevel
#             initialLevel
#             collateralReleaseLevel
#             timestamp
#             party {
#                 id
#             }
#         }
#     }
# '''

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
            'payload': { 'query': get_market_data_query(market_id) }
        }))

def sub_positions(ws):
    parties = get_parties()
    for party in parties:
        party_id = party['id']
        ws.send(json.dumps({
            'id': f'positions_party_{party_id}',
            'type': 'start',
            'payload': { 'query': get_positions_query(party_id) }
        }))

def on_message(ws, message):
    print(json.loads(message))

def on_error(ws, error):
    print(error)

def on_close(ws):
    print('### closed ###')

def on_open(ws):
    sub_init(ws)
    sub_markets(ws)
    sub_positions(ws)

def connect():
    ws = websocket.WebSocketApp(f"{WS_URL}/query",
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.on_open = on_open
    ws.run_forever()

if __name__ == '__main__':
    connect()
