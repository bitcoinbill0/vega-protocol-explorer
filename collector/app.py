import requests
import os
import json
import pymongo
import time
import datetime
from influxdb import InfluxDBClient

time.sleep(5)

INFLUX_HOST = os.environ['INFLUX_HOST']
MONGO_HOST = os.environ['MONGO_HOST']

influxdb_client = InfluxDBClient(host=INFLUX_HOST, port=8086)
influxdb_client.create_database('vega_history')
influxdb_client.switch_database('vega_history')

client = pymongo.MongoClient(host=MONGO_HOST,
                             port=27017,
                             username="root",
                             password="password123")
db = client.vega

GQ_URL = os.environ['GQ_URL']

query = '''
query {
  parties {
    id
    positions {
      market {
        name
        id
        decimalPlaces
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
          totalSupply
          decimals
        }
        maintenanceLevel
        searchLevel
        initialLevel
        collateralReleaseLevel
      }
    }
  }
}
'''

body = {
  'query': query
}

last_influx_updates = {}

def update_parties():
    global last_influx_update
    response = None
    try:
        response = requests.post(GQ_URL, json=body)
    except:
        print('Error calling Vega API')
    if not response:
        return
    data = response.json()
    for party in data["data"]["parties"]:
        saved_party = None
        try:
            saved_party = db.parties.find_one({
                "id": party["id"]
            })
        except:
            print('Error whilst reading from mongo')
        if not saved_party:
            if len(party["positions"]) > 0:
                try:
                    db.parties.insert_one(party)
                except:
                    print('Error whilst writing to mongo')
        else:
            # TODO - don't need to store in influx more often than once per minute
            this_minute = datetime.datetime.now().minute
            if not last_influx_updates.get(party["id"]) or last_influx_updates.get(party["id"]) != this_minute:
                try:
                    influxdb_client.write_points([
                        {
                            "measurement": party["id"],
                            "fields": {
                                "party": json.dumps(party)
                            },
                            "time": datetime.datetime.now().isoformat()
                        }
                    ])
                    last_influx_updates[party["id"]] = this_minute
                except:
                    print('Error whilst writing to influx')
            try:
                db.parties.update({"_id": saved_party["_id"]}, {"$set": party})
            except:
                print('Error whilst writing to mongo')

while True:
    update_parties()
    time.sleep(1)
