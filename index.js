import express from "express";
import moment from "moment-timezone";
import fetch from "node-fetch";
import { color } from "./color.js";
import { icon } from "./icon.js";

const app = express();
const port = 3000;
const TAM_DATA_ENDPOINT =
	"http://data.montpellier3m.fr/sites/default/files/ressources/TAM_MMM_TpsReel.csv";
const TAM_DATA_STOP =
	"https://data.montpellier3m.fr/sites/default/files/ressources/MMM_MMM_ArretsTram.csv";

app.listen(port, () => {
	console.log(`listening on port ${port}`);
});

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept"
	);
	next();
});

app.get("/api/", async (req, res) => {
	let result;

	try {
		result = await fetchAndFilterAllCoursesForHeadSign();
	} catch (error) {
		res.json({
			success: false,
			error: error,
		});
	}
	res.json({
		success: true,
		message: "that is all course you can do",
		result: result,
		last_updated: new Date()
			.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
			.split(",")[1],
	});
});

app.get("/api/all/", async (req, res) => {
	let result;

	try {
		result = await fetchAndFilterAllCourses();
	} catch (error) {
		res.json({
			success: false,
			error: error,
		});
	}
	res.json({
		success: true,
		message: "that is all course you can do",
		result: result,
		last_updated: new Date()
			.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
			.split(",")[1],
	});
});

app.get("/api/from", async (req, res) => {
	let result;
	let parsedResult;

	try {
		result = await fetchAndFilterAllCourses();
		parsedResult = await parseAllStop(result, req.query);
	} catch (error) {
		res.json({
			success: false,
			error: error,
		});
	}
	res.json({
		success: true,
		message: "that is all course you can go from " + req.query.start_name,
		result: parsedResult,
		last_updated: new Date()
			.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
			.split(",")[1],
	});
});

app.get("/api/query/", async (req, res) => {
	let result;
	let parsedResult;

	try {
		result = await fetchAndFilterForTram(req.query);
		parsedResult = await parseCourseTam(result, req.query);
	} catch (error) {
		res.json({
			success: false,
			error: error,
		});
	}
	res.json({
		success: true,
		result: parsedResult,
		last_updated: new Date()
			.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
			.split(",")[1],
	});
});

app.get("/api/trip/", async (req, res) => {
	let result;
	let parsedResult;

	try {
		result = await fetchAndFilterForTramForTrip(req.query);
		parsedResult = await parseCourseTam(result, req.query);
	} catch (error) {
		res.json({
			success: false,
			error: error,
		});
	}
	res.json({
		success: true,
		result: parsedResult,
		last_updated: new Date()
			.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
			.split(",")[1],
	});
});

function parseCSV(str, delimiter = ";") {
	const headers = str.slice(0, str.indexOf("\n")).trim().split(delimiter);
	const rows = str
		.slice(str.indexOf("\n") + 1)
		.trim()
		.split(/\r\n|\n|\r/);

	const arr = rows.map(function (row) {
		const values = row.split(delimiter);
		const el = headers.reduce(function (object, header, index) {
			object[header] = values[index];
			return object;
		}, {});
		return el;
	});
	return arr;
}

const fetchAndFilterAllCoursesForHeadSign = async () => {
	const tamCSV = await (await fetch(TAM_DATA_ENDPOINT)).text();
	const records = parseCSV(tamCSV);
	let allCourses = records.map((o) => ({
		stop_name: o.stop_name,
		trip_headsign: o.trip_headsign,
		direction_id: o.direction_id,
	}));
	for (let index = 0; index < allCourses.length; index++) {
		if (allCourses[index].trip_headsign === "GARCIA LORCA") {
			if (allCourses[index].direction_id === "1") {
				allCourses[index].trip_headsign = "GARCIA LORCA SENS A";
			} else {
				allCourses[index].trip_headsign = "GARCIA LORCA SENS B";
			}
		}
		delete allCourses[index].direction_id;
	}
	return allCourses.filter(
		(v, i, a) =>
			a.findIndex((v2) =>
				["stop_name", "trip_headsign"].every((k) => v2[k] === v[k])
			) === i
	);
};

function getKeyByValue(object, value) {
	return Object.keys(object).find((key) => object[key] === value);
}

const fetchAndFilterAllCourses = async () => {
	const tamCSV = await (await fetch(TAM_DATA_STOP)).text();
	const records = parseCSV(tamCSV, ",");
	let arrTo = [];
	for (const rec of records) {
		let key = getKeyByValue(rec, "X");
		for (const r of records) {
			if (r[key] === "X" && r.nom !== rec.nom) {
				arrTo.push({
					start_name: rec.nom,
					stop_name: r.nom,
				});
			}
		}
	}
	return arrTo;
};

const parseAllStop = async (result, start) => {
	const res = result.filter(
		(e) => e.start_name === start.start_name.toUpperCase()
	)
	const filteredArr = res.reduce((acc, current) => {
		const x = acc.find(item => item.stop_name === current.stop_name);
		if (!x) {
		  return acc.concat([current]);
		} else {
		  return acc;
		}
	  }, []);
	  return filteredArr
};

const fetchAndFilterForTram = async (filters) => {
	const tamCSV = await (await fetch(TAM_DATA_ENDPOINT)).text();
	const records = parseCSV(tamCSV);
	for (let index = 0; index < records.length; index++) {
		if (records[index].trip_headsign === "GARCIA LORCA") {
			if (records[index].direction_id === "0") {
				records[index].trip_headsign = "GARCIA LORCA SENS A";
			} else {
				records[index].trip_headsign = "GARCIA LORCA SENS B";
			}
		}
	}
	return records.filter((r) =>
		Object.keys(filters).every((key) => r[key] == filters[key].toUpperCase())
	);
};

const fetchAndFilterForTramForTrip = async (filters) => {
	const tamCSV = await (await fetch(TAM_DATA_ENDPOINT)).text();
	const records = parseCSV(tamCSV);
	for (let index = 0; index < records.length; index++) {
		if (records[index].trip_headsign === "GARCIA LORCA") {
			if (records[index].direction_id === "0") {
				records[index].trip_headsign = "GARCIA LORCA SENS A";
			} else {
				records[index].trip_headsign = "GARCIA LORCA SENS B";
			}
		}
	}
	let arrOfAllCourse = [];
	let arr = [];
	for (const rec of records) {
		if (rec.stop_name === filters.start || rec.stop_name === filters.end) {
			arrOfAllCourse.push(rec);
		}
	}
	for (const course of arrOfAllCourse) {
		let arrTemp = [];
		arrTemp.push(course);
		for (const course2 of arrOfAllCourse) {
			if (course.course === course2.course) {
				if (course.stop_name !== course2.stop_name) {
					arrTemp.push(course2);
				}
			}
		}
		if (arrTemp.length > 1 || arrTemp[0].trip_headsign === filters.end) {
			const lowTime = arrTemp.reduce((previous, current) => {
				if (
					previous.departure_time[0] === "2" &&
					previous.departure_time[1] === "3" &&
					current.departure_time[0] === "0" &&
					current.departure_time[1] === "0"
				) {
					return previous;
				} else if (
					previous.departure_time[0] === "0" &&
					previous.departure_time[1] === "0" &&
					current.departure_time[0] === "2" &&
					current.departure_time[1] === "3"
				) {
					return current;
				} else {
					return current.departure_time < previous.departure_time
						? current
						: previous;
				}
			});
			arr.push(lowTime);
		}
	}
	const result = arr.filter((e) => e.stop_name === filters.start);
	const filteredArr = result.reduce((acc, current) => {
		const x = acc.find(item => item.course === current.course);
		if (!x) {
		  return acc.concat([current]);
		} else {
		  return acc;
		}
	  }, []);
	return filteredArr;
};

const parseCourseTam = async (result, query) => {
	let res = {};
	let time = [];
	let now = moment(new Date()).tz("Europe/Paris");

	if (result.length === 0) {
		res["time"] = ["Indisponible"];
		res["stop"] = query.stop_name;
		res["direction"] = query.trip_headsign;
		res["icon"] = icon[0];
		res["color"] = color[0];
	} else {
		for (const course of result) {
			let fullDateOfTimeCourse = moment(new Date()).tz("Europe/Paris");
			let [hours, minutes, seconds] = course.departure_time.split(":");
			if (
				hours >= "00" &&
				hours <= "03" &&
				(now.hour() == "22" || now.hour() == "23")
			)
				fullDateOfTimeCourse.add(1, "days");
			fullDateOfTimeCourse.set({
				hour: hours,
				minute: minutes,
				second: seconds,
			});
			if (fullDateOfTimeCourse > now) {
				let min = fullDateOfTimeCourse.diff(now, "minutes");
				time.push(min);
			}
		}
		if (time.length === 0) {
			time.push("Indisponible");
			res["time"] = time;
		} else {
			let sortedTime = time.sort(function (a, b) {
				return a - b;
			});
			for (let i = 0; i < sortedTime.length; i++) {
				if (sortedTime[i] < "2") {
					sortedTime[i] = "Proche !!";
				}
			}
			res["time"] = sortedTime;
		}
		res["stop"] = result[0].stop_name;
		res["direction"] = result[0].trip_headsign;
		res["icon"] = icon[result[0].route_short_name];
		res["color"] = color[result[0].route_short_name];
	}
	return res;
};

export { app };
