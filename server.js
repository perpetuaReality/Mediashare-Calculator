import express from "express"
import { parse } from "tinyduration"

const app = express()
const port = 3000

app.get("/", (_, res) => {
	res.sendFile("index.html", { root: "." })
})

const VIDEO_NOT_FOUND_ERR = {
	error: "Couldn't find that video! Please check the ID.",
}
const AUTHORIZATION_ERR = {
	error: "An authorization error occurred! Please contact Perp.",
}

const SECONDS_IN_A_DAY = 60 * 60 * 24
const SECONDS_IN_AN_HOUR = 60 * 60
const SECONDS_IN_A_MINUTE = 60

app.get("/videoLength/:id", (req, res) => {
	const videoID = req.params.id
	if (videoID.length !== 11) return res.status(400).send(VIDEO_NOT_FOUND_ERR)

	fetch(
		`https://www.googleapis.com/youtube/v3/videos?id=${videoID}&key=${process.env.YOUTUBE_KEY}&part=contentDetails&fields=items(contentDetails/duration)`,
	)
		.then((res) => res.json())
		.then((body) => {
			if (!body.error?.code) {
				if (!body.items.length)
					return res.status(400).send(VIDEO_NOT_FOUND_ERR)

				const videoDuration = body.items[0].contentDetails.duration
				const durationParts = parse(videoDuration)
				const videoSeconds =
					(durationParts.days ?? 0) * SECONDS_IN_A_DAY +
					(durationParts.hours ?? 0) * SECONDS_IN_AN_HOUR +
					(durationParts.minutes ?? 0) * SECONDS_IN_A_MINUTE +
					(durationParts.seconds ?? 0)
				return res.status(200).send({ duration: videoSeconds })
			}

			console.error(body)
			switch (body.error.code) {
				case 400:
				case 404:
					res.status(400).send(VIDEO_NOT_FOUND_ERR)
				case 403:
					res.status(400).send(AUTHORIZATION_ERR)
			}
		})
})

app.listen(port, () => {
	console.log(`Mediashare calculator listening on port ${port}`)
})
