export const YOUTUBE_VIDEO_ID_LENGTH = 11
export function validateVideoID(candidate) {
	return (
		candidate &&
		candidate.length === YOUTUBE_VIDEO_ID_LENGTH &&
		candidate.match(/^[A-Za-z0-9\-_]*$/)
	)
}
export function formatCurrency(amount) {
	return new Intl.NumberFormat("us-US", {
		style: "currency",
		currency: "USD",
	}).format(amount)
}
