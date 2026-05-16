import express from "express"
import { parse } from "tinyduration"
import { join } from "path"
import { rateLimit } from "express-rate-limit"
import { validateVideoID } from "./shared/util.js"

const app = express()
const port = 3000

process.loadEnvFile(".env")

/* === ROUTING === */
app.use("/", express.static("public"))
app.get("/", function (req, res) {
	res.sendFile(path.resolve("public/index.html"))
})
app.use("/shared", express.static("shared"))

/* === VIDEO LENGTH FETCH === */
const SECONDS_IN_A_DAY = 60 * 60 * 24
const SECONDS_IN_AN_HOUR = 60 * 60
const SECONDS_IN_A_MINUTE = 60
const ERRORS = {
	INVALID_VIDEO_ID:
		'Please input a valid video ID! (Just the part after "?v=")',
	VIDEO_NOT_FOUND: "Couldn't find that video! Please check the ID.",
	AUTHORIZATION: "An authorization error occurred! Please contact Perp.",
	RATE_LIMIT: "Too many requests (heh)! Please try again later.",
}
/* == RATE LIMITING == */
// Yes, these values are lifted directly from the documentation lol. If it ain't broke...
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive,
	message: buildError(ERRORS.RATE_LIMIT),
	// store: ... , // Redis, Memcached, etc. Using in-memory for now.
})
app.get("/videoLength/:id", limiter, (req, res) => {
	const videoID = req.params.id
	if (!validateVideoID(videoID))
		return res.status(400).send(buildError(ERRORS.INVALID_VIDEO_ID))

	fetch(
		`https://www.googleapis.com/youtube/v3/videos?id=${videoID}&key=${process.env.YOUTUBE_KEY}&part=contentDetails&fields=items(contentDetails/duration)`,
		{
			headers: {
				Referer: process.env.HOST_DOMAIN,
			},
		},
	)
		.then((res) => res.json())
		.then((body) => {
			if (!body.error?.code) {
				if (!body.items.length)
					return res
						.status(400)
						.send(buildError(ERRORS.VIDEO_NOT_FOUND))

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
					res.status(400).send(buildError(ERRORS.VIDEO_NOT_FOUND))
				case 403:
					res.status(400).send(buildError(ERRORS.AUTHORIZATION))
			}
		})
})

/* === START SERVER === */
app.listen(port, () => {
	console.log(`Mediashare calculator listening on port ${port}`)
})

/* === SERVER-SIDE UTILS === */
function buildError(message) {
	return { error: message }
}
