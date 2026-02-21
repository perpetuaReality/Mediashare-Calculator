function validateVideoID(candidate) {
	return (
		candidate &&
		candidate.length === 11 &&
		candidate.match(/^[A-z0-9\-_]*$/)
	)
}
