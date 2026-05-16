import { validateVideoID, formatCurrency } from "/shared/util.js"

const MESSAGE_STYLES = {
	SUSPENSE: "suspense",
	SUCCESS: "success",
	ERROR: "error",
}
const PER_SEC_COST_PARAM_NAME = "perSec"
const MINIMUM_COST_PARAM_NAME = "min"
let idField, costPerSecondField, minimumField, resultsSection, videoInfoTemplate // DOM ELEMENTS.
let initialCostPerSecond = 0.05,
	initialMinimum = 3 // INITIAL COST CONSTANTS.
// The initial cost constants are fine-tuned to use Socks' (https://twitch.tv/socksbx) presets as a guide, but this is arbitrary.

/* === INITIALIZATION === */
document.addEventListener("DOMContentLoaded", () => {
	// Set the DOM element variables for future use.
	idField = document.getElementById("videoID")
	costPerSecondField = document.getElementById("costPerSecond")
	minimumField = document.getElementById("minimum")
	resultsSection = document.getElementById("results")
	videoInfoTemplate = document.getElementById("videoInformationTemplate")

	// Hook up the event listeners for the buttons on the DOM.
	document.getElementById("resetButton").addEventListener("click", resetCosts)
	document
		.getElementById("copyLinkButton")
		.addEventListener("click", copyLink)
	document
		.getElementById("calculateButton")
		.addEventListener("click", calculate)

	// Get the cost constants from the URL if they're available.
	const queryParams = new URLSearchParams(location.search)
	const costPerSecondParam = queryParams.get(PER_SEC_COST_PARAM_NAME)
	const minimumParam = queryParams.get(MINIMUM_COST_PARAM_NAME)
	if (isValidCost(costPerSecondParam))
		initialCostPerSecond = costPerSecondParam
	if (isValidCost(minimumParam)) initialMinimum = minimumParam

	// Get the initial cost constants ready.
	resetCosts()
})

function resetCosts() {
	// FAILSAFE IN CASE WE DON'T FIND THE DOM ELEMENTS.
	if (!costPerSecondField || !minimumField)
		alert(
			"An error has occurred!\nOne of the expected DOM elements wasn't found for function resetCosts.",
		)

	costPerSecondField.value = initialCostPerSecond
	minimumField.value = initialMinimum
}

// In this function we don't use the info display for notifications in case the user already has video information displayed.
function copyLink() {
	// FAILSAFE IN CASE WE DON'T FIND THE DOM ELEMENTS.
	if (!costPerSecondField || !minimumField)
		alert(
			"An error has occurred!\nOne of the expected DOM elements wasn't found for function copyLink.",
		)

	const params = new URLSearchParams({
		[PER_SEC_COST_PARAM_NAME]: costPerSecondField.value,
		[MINIMUM_COST_PARAM_NAME]: minimumField.value,
	})
	const link = `${location.origin}${location.pathname}?${params.toString()}`

	navigator.clipboard
		.writeText(link)
		.then(() => {
			alert("Link copied to clipboard!")
		})
		.catch(() => {
			alert(
				"Failed to put link on your clipboard. Please copy this directly: " +
					link,
			)
		})
}

function calculate() {
	// FAILSAFE IN CASE WE DON'T FIND THE DOM ELEMENTS.
	if (
		!resultsSection ||
		!idField ||
		!costPerSecondField ||
		!minimumField ||
		!videoInfoTemplate
	)
		alert(
			"An error has occurred!\nOne of the expected DOM elements wasn't found for function calculate.",
		)

	const videoID = extractVideoID(idField.value) // Returns false if invalid URL.
	if (!videoID) {
		resultsSection.className = MESSAGE_STYLES.ERROR
		resultsSection.textContent =
			"ERROR! Please input a valid YouTube URL or YouTube video ID!"
		return
	}

	resultsSection.className = MESSAGE_STYLES.SUSPENSE
	resultsSection.textContent = "Fetching..."
	fetch("/api/videoLength/" + videoID)
		.then((res) => res.json())
		.then((body) => {
			if (body.error) {
				resultsSection.className = MESSAGE_STYLES.ERROR
				resultsSection.textContent = "ERROR! " + body.error
			} else {
				const costPerSecond = costPerSecondField.value
				const minimum = minimumField.value
				const rawVideoCost = body.duration * costPerSecond
				const videoCost =
					rawVideoCost < minimum ? minimum : rawVideoCost

				const resultObject = document.importNode(
					videoInfoTemplate.content,
					true,
				)
				resultObject.querySelector("#duration").textContent =
					body.duration
				resultObject.querySelector("#cost").textContent =
					formatCurrency(videoCost)

				resultsSection.className = MESSAGE_STYLES.SUCCESS
				resultsSection.textContent = ""
				resultsSection.appendChild(resultObject)
			}
		})
}

/* === UTILS === */
function isValidCost(val) {
	return val && Number.parseFloat(val) && !Number.isNaN(val)
}

function extractVideoID(inputURL) {
	// If the "URL" is just an already-isolated video ID, return it unchanged.
	if (validateVideoID(inputURL)) return inputURL

	let candidateVideoID = ""
	// Prepend the protocol to the URL if necessary to create a valid URL and then be able to use the URL library interface.
	if (!inputURL.startsWith("https://")) inputURL = "https://" + inputURL

	// For short URLs, the video ID is in the pathname.
	if (
		inputURL.startsWith("https://www.youtu.be/") ||
		inputURL.startsWith("https://youtu.be/")
	)
		candidateVideoID = URL.parse(inputURL)?.pathname.slice(1) // Remove the starting slash.
	// For long URLs, the video ID is in the "v" query parameter.
	else if (
		inputURL.startsWith("https://www.youtube.com/") ||
		inputURL.startsWith("https://youtube.com/")
	)
		candidateVideoID = URL.parse(inputURL)?.searchParams.get("v")
	else return false // If none of the previous patterns holds, this is not a valid URL.

	if (validateVideoID(candidateVideoID)) return candidateVideoID
	else return false
}
