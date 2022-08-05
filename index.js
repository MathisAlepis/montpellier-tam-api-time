
import fetch from 'node-fetch';
import express from 'express';
import { parse } from 'csv-parse/sync';
import { color } from './color.js'
import { icon } from './icon.js'
import moment from 'moment-timezone';

const app = express()
const port = 3000
const TAM_DATA_ENDPOINT = "http://data.montpellier3m.fr/sites/default/files/ressources/TAM_MMM_TpsReel.csv"

app.listen(port, () => {
	console.log(`listening on port ${port}`)
})

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
  });

app.get('/api/', async (req, res) => {
	let result;

	try {
		result = await fetchAndFilterAllCourses()
	} catch (error) {
		res.json({
			success: false,
			error: error,
		})
	}
	res.json({
		success: true,
		message: "that is all course you can do",
		result: result,
		last_updated: (new Date).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}).split(',')[1]
	})

})

app.get('/api/query/', async (req, res) => {
	let result;
	let parsedResult;

	try {
		result = await fetchAndFilterForTram(req.query)
		parsedResult = await parseCourseTam(result, req.query)
	} catch (error) {
		res.json({
			success: false,
			error: error,
		})
	}
	res.json({
		success: true,
		result: parsedResult,
		last_updated: (new Date).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}).split(',')[1]
	})

})

const fetchAndFilterAllCourses = async () => {
	const tamCSV = await (await fetch(TAM_DATA_ENDPOINT)).text()
	const records = parse(tamCSV, {
		columns: true,
		skip_empty_lines: true,
		delimiter: ';',
	})
	let allCourses = records.map(o => ({ stop_name: o.stop_name, trip_headsign: o.trip_headsign }))
	return allCourses.filter((v, i, a) => a.findIndex(v2 => ['stop_name', 'trip_headsign'].every(k => v2[k] === v[k])) === i)
}

const fetchAndFilterForTram = async (filters) => {
	const tamCSV = await (await fetch(TAM_DATA_ENDPOINT)).text()
	const records = parse(tamCSV, {
		columns: true,
		skip_empty_lines: true,
		delimiter: ';',
	})
	return records.filter(r =>
		Object.keys(filters).every(key => r[key] == filters[key].toUpperCase())
	)
}
// HOTFIX : ajoute 2 heures car serveur en GMT 0
function addHours(numOfHours, date = new Date()) {
	date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);

	return date;
  }

const parseCourseTam = async (result, query) => {
	let res = {}
	let time = []
	let now = moment(new Date()).tz("Europe/Paris")

	if (result.length === 0) {
		res['time'] = ["Fin de service"]
		res['stop'] = query.stop_name
		res['direction'] = query.trip_headsign
		res['icon'] = icon[0]
		res['color'] = color[0]
	}

	else {
		for (const course of result) {
			let fullDateOfTimeCourse = moment(new Date()).tz("Europe/Paris")
			let [hours, minutes, seconds] = course.departure_time.split(':');
			if ((hours >= "00" && hours <= "03") && (now.hour() == "22" || now.hour() == "23" )) fullDateOfTimeCourse.add(1, 'days');
			fullDateOfTimeCourse.set({hour:hours,minute:minutes,second:seconds})
			if (fullDateOfTimeCourse > now) {
				let min = fullDateOfTimeCourse.diff(now, 'minutes');
				time.push(min)
			}
		}
		if (time.length === 0) {
			time.push("Indisponible")
			res['time'] = time
		}
		else {
			let sortedTime = time.sort(function(a, b){return a - b});
			for (let i = 0; i < sortedTime.length; i++) {
				if (sortedTime[i] < "2") {
					sortedTime[i] = 'Proche !!';
				}
			  }
			res['time'] = sortedTime
		}
		res['stop'] = result[0].stop_name
		res['direction'] = result[0].trip_headsign
		res['icon'] = icon[result[0].route_short_name]
		res['color'] = color[result[0].route_short_name]
	}
	return (res)
}

export { app }