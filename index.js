
import fetch from 'node-fetch';
import express from 'express';
import { parse } from 'csv-parse/sync';
import { color } from './color.js'
import { icon } from './icon.js'

const app = express()
const port = 3000
const TAM_DATA_ENDPOINT = "http://data.montpellier3m.fr/sites/default/files/ressources/TAM_MMM_TpsReel.csv"

app.listen(port, () => {
	console.log(`listening on port ${port}`)
})

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
		parsedResult = await parseCourseTam(result)
		if (parsedResult.time.length === 0) parsedResult.time.push("Indisponible")
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

const parseCourseTam = async (result) => {
	let testtt = []
	let res = {}
	let time = []
	// HOTFIX : ajoute 2 heures car serveur en GMT 0
	// let now = new Date()
	let now = addHours(2, new Date())

	if (result.length === 0) time.push("Indisponible")

	else for (const course of result) {
		let fullDateOfTimeCourse = new Date();
		let [hours, minutes, seconds] = course.departure_time.split(':');
		fullDateOfTimeCourse.setHours(+hours);
		fullDateOfTimeCourse.setMinutes(minutes);
		fullDateOfTimeCourse.setSeconds(seconds);
		testtt.push(fullDateOfTimeCourse)
		testtt.push(now)

		if (fullDateOfTimeCourse > now) {
			var diff = Math.abs(now - fullDateOfTimeCourse);
			const min = (Math.floor((diff / 1000) / 60))
			if (min <= 1) time.push("Proche !!")
			else time.push(min)
		}
	}
	res['time'] = time
	res['stop'] = result[0].stop_name
	res['direction'] = result[0].trip_headsign
	res['icon'] = icon[result[0].route_short_name]
	res['color'] = color[result[0].route_short_name]
	res["hhh"] = testtt
	return (res)
}

export { app }