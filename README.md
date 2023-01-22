# montpellier-tam-api-time

## Example

Querying https://montpellier-tam-api-time.vercel.app/api/query?stop_name=ANTIGONE&trip_headsign=MOSSON will retrieve all time for courses from a stop (ex:ANTIGONE) to terminus (ex:MOSSON).

Querying https://montpellier-tam-api-time.vercel.app/api/trip?start=PORT%20MARIANNE&end=MALBOSC will retrieve all time for courses from a stop (ex:PORT MARIANNE to another stop (ex:MALBOSC).

Querying https://montpellier-tam-api-time.vercel.app/api/from?start_name=PORT%20MARIANNE will retrieve all available courses you can do from a stop (ex:PORT MARIANNE).

Querying https://montpellier-tam-api-time.vercel.app/api/ will retrieve all available courses you can do


## Available fields

- stop_name (Arrêt)
- trip_headsign (Direction)

## References

http://data.montpellier3m.fr/dataset/offre-de-transport-tam-en-temps-reel/resource/e37afbf0-0156-439e-9abe-1a2c84cc33d8


## Thanks

Thanks to original API based on work of [aslafy-z](https://github.com/aslafy-z/montpellier-tam-api)
