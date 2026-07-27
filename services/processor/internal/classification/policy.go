package classification

type Level int
const ( Public Level = iota; Internal; Confidential; Restricted )
func Allows(source, destination Level) bool { return destination >= source }
func RetentionAllowed(days int, legalHold bool) bool { return legalHold || (days >= 1 && days <= 3650) }
