
import fetch from 'node-fetch';
import express from 'express';
import { parse } from 'csv-parse/sync';

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
	} catch (error) {
		res.json({
			success: false,
			error: error,
		})
	}
	res.json({
		success: true,
		result: parsedResult,
		last_updated: (new Date).toTimeString().split(' ')[0]
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

const parseCourseTam = async (result) => {
	let res = []
	let now = new Date()
	if (result.length === 0) res.push("Indisponible")
	else for (const course of result) {
		let fullDateOfTimeCourse = new Date();
		let [hours, minutes, seconds] = course.departure_time.split(':');
		fullDateOfTimeCourse.setHours(+hours);
		fullDateOfTimeCourse.setMinutes(minutes);
		fullDateOfTimeCourse.setSeconds(seconds);
		if (fullDateOfTimeCourse > now) {
			var diff = Math.abs(now - new Date(fullDateOfTimeCourse));
			const min = (Math.floor((diff / 1000) / 60))
			if (min <= 1) res.push("Proche !!")
			else res.push(timeConvert(min))
		}
	}
	if (res.length === 0) res.push("Indisponible")
	return (res)
}

function timeConvert(n) {
	var num = n;
	var hours = (num / 60);
	var rhours = Math.floor(hours);
	var minutes = (hours - rhours) * 60;
	var rminutes = Math.round(minutes);
	if (rhours != 0) return rhours + " heure(s) " + rminutes + " minutes";
	else return rminutes + " minutes";
}

export { app }